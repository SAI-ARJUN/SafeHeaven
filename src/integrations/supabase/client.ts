import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ybblmjhridmzvcqosmml.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliYmxtamhyaWRtenZjcW9zbW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODE5MjMsImV4cCI6MjA4NTM1NzkyM30.EKP_nKEDbc5djl4j161A79GTfrJFI5bNFFReKGRzWvU";

console.log('🔗 Connecting to Supabase:', SUPABASE_URL);

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});