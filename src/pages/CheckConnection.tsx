import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CheckConnection: React.FC = () => {
  const [status, setStatus] = useState<string>('Checking...');
  const [details, setDetails] = useState<any>({});

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      console.log('🔍 Checking Supabase connection...');
      console.log('📡 Supabase URL:', supabase.supabaseUrl);
      
      setStatus('Connecting to Supabase...');
      
      // Test 1: Simple query to check connection
      const { data, error } = await supabase.from('profiles').select('*').limit(1);
      
      if (error) {
        console.error('❌ Connection failed:', error);
        setStatus('❌ Connection Failed');
        setDetails({
          url: supabase.supabaseUrl,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      } else {
        console.log('✅ Connection successful!');
        setStatus('✅ Connection Successful');
        
        // Get counts from all tables
        const [profiles, alerts, locations, zones] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('alerts').select('*', { count: 'exact', head: true }),
          supabase.from('user_locations').select('*', { count: 'exact', head: true }),
          supabase.from('danger_zones').select('*', { count: 'exact', head: true }),
        ]);
        
        setDetails({
          url: supabase.supabaseUrl,
          profiles: { count: profiles.count || 0, error: profiles.error?.message },
          alerts: { count: alerts.count || 0, error: alerts.error?.message },
          locations: { count: locations.count || 0, error: locations.error?.message },
          zones: { count: zones.count || 0, error: zones.error?.message },
          sampleData: data,
        });
      }
    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setStatus('❌ Error: ' + err.message);
      setDetails({ error: err.message, stack: err.stack });
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 container mx-auto px-4 max-w-2xl">
      <h1 className="font-display text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold">Status:</span>
          <span className={`px-4 py-2 rounded-lg font-bold ${
            status.includes('✅') ? 'bg-green-500/20 text-green-400' :
            status.includes('❌') ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {status}
          </span>
        </div>
        
        <button
          onClick={checkConnection}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          🔁 Test Connection Again
        </button>
      </div>
      
      {Object.keys(details).length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Connection Details</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Supabase URL</p>
              <p className="font-mono text-sm">{details.url}</p>
            </div>
            
            {details.profiles && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">📊 Profiles</p>
                  <p className="text-2xl font-bold">{details.profiles.count}</p>
                  {details.profiles.error && (
                    <p className="text-xs text-red-400 mt-1">{details.profiles.error}</p>
                  )}
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">🚨 Alerts</p>
                  <p className="text-2xl font-bold">{details.alerts.count}</p>
                  {details.alerts.error && (
                    <p className="text-xs text-red-400 mt-1">{details.alerts.error}</p>
                  )}
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">📍 Locations</p>
                  <p className="text-2xl font-bold">{details.locations.count}</p>
                  {details.locations.error && (
                    <p className="text-xs text-red-400 mt-1">{details.locations.error}</p>
                  )}
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">🛡️ Danger Zones</p>
                  <p className="text-2xl font-bold">{details.zones.count}</p>
                  {details.zones.error && (
                    <p className="text-xs text-red-400 mt-1">{details.zones.error}</p>
                  )}
                </div>
              </div>
            )}
            
            {details.error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm font-semibold text-red-400 mb-2">Error Details</p>
                <pre className="text-xs text-red-300 whitespace-pre-wrap">
                  {JSON.stringify({
                    message: details.error,
                    code: details.code,
                    details: details.details,
                    hint: details.hint,
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>💡 Tip:</strong> Open browser console (F12) to see detailed logs
        </p>
      </div>
    </div>
  );
};

export default CheckConnection;
