import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const url = new URL(req.url);
  const path = url.pathname.replace("/api", "");
  const method = req.method;

  try {
    // Health check
    if (path === "/health" && method === "GET") {
      return new Response(
        JSON.stringify({ status: "OK", timestamp: new Date() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users
    if (path === "/users" && method === "GET") {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user by ID
    const userByIdMatch = path.match(/^\/users\/([^/]+)$/);
    if (userByIdMatch && method === "GET") {
      const userId = userByIdMatch[1];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user status
    const statusMatch = path.match(/^\/users\/([^/]+)\/status$/);
    if (statusMatch && method === "PATCH") {
      const userId = statusMatch[1];
      const body = await req.json();
      const { status } = body;

      const { data, error } = await supabase
        .from("profiles")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      // Create alert if status is alert/danger
      if (status === "alert" || status === "danger") {
        await supabase.from("alerts").insert({
          user_id: userId,
          tourist_id: data.tourist_id,
          username: data.username,
          status: status,
          alert_type: "status_change",
        });
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all danger zones
    if (path === "/danger-zones" && method === "GET") {
      const { data, error } = await supabase
        .from("danger_zones")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create danger zone
    if (path === "/danger-zones" && method === "POST") {
      const body = await req.json();
      const { name, lat, lng, radius, level, created_by } = body;

      const { data, error } = await supabase
        .from("danger_zones")
        .insert({ name, lat, lng, radius, level, created_by })
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete danger zone
    const deleteZoneMatch = path.match(/^\/danger-zones\/([^/]+)$/);
    if (deleteZoneMatch && method === "DELETE") {
      const zoneId = deleteZoneMatch[1];
      const { error } = await supabase
        .from("danger_zones")
        .delete()
        .eq("id", zoneId);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active alerts
    if (path === "/alerts" && method === "GET") {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("dismissed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dismiss alert
    const dismissMatch = path.match(/^\/alerts\/([^/]+)\/dismiss$/);
    if (dismissMatch && method === "PATCH") {
      const alertId = dismissMatch[1];
      const { data, error } = await supabase
        .from("alerts")
        .update({ dismissed: true })
        .eq("id", alertId)
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user location
    if (path === "/locations" && method === "POST") {
      const body = await req.json();
      const { user_id, tourist_id, lat, lng, username } = body;

      // Upsert location
      const { data, error } = await supabase
        .from("user_locations")
        .upsert(
          { user_id, tourist_id, lat, lng, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;

      // Check if user is in danger zone
      const { data: zones } = await supabase.from("danger_zones").select("*");

      for (const zone of zones || []) {
        const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
        if (distance <= zone.radius) {
          // User entered danger zone - create alert
          await supabase.from("alerts").insert({
            user_id,
            tourist_id,
            username: username || "Unknown",
            status: "danger",
            alert_type: "entered_danger_zone",
            lat,
            lng,
            zone_name: zone.name,
            zone_level: zone.level,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Register new user/tourist profile
    if (path === "/register" && method === "POST") {
      const body = await req.json();
      const { username, email, phone, dob, wallet_address, tourist_id, user_id } = body;

      // Generate tourist_id if not provided
      const generateTouristId = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `TID-${timestamp}-${random}`;
      };

      const finalTouristId = tourist_id || generateTouristId();
      const finalUserId = user_id || crypto.randomUUID();

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          user_id: finalUserId,
          tourist_id: finalTouristId,
          username,
          email,
          phone,
          dob,
          wallet_address,
          status: "safe",
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analytics endpoint
    if (path === "/analytics" && method === "GET") {
      const { data: profiles } = await supabase.from("profiles").select("status");
      const { data: alerts } = await supabase
        .from("alerts")
        .select("*")
        .eq("dismissed", false);

      const stats = {
        total_users: profiles?.length || 0,
        safe_users: profiles?.filter((p) => p.status === "safe").length || 0,
        alert_users: profiles?.filter((p) => p.status === "alert").length || 0,
        danger_users: profiles?.filter((p) => p.status === "danger").length || 0,
        active_alerts: alerts?.length || 0,
      };

      return new Response(
        JSON.stringify({ success: true, data: stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 404 Not Found
    return new Response(
      JSON.stringify({ success: false, error: "Not Found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});