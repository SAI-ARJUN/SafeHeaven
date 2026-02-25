import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TestDatabase: React.FC = () => {
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      console.log('🔍 Testing Supabase connection...');
      console.log('📡 Supabase URL:', supabase.supabaseUrl);
      
      // Test 1: Check if we can connect
      const { data: pingData, error: pingError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (pingError) {
        console.error('❌ Connection test failed:', pingError);
      } else {
        console.log('✅ Connection successful!');
      }
      
      // Test 2: Check profiles table
      const profilesRes = await supabase.from('profiles').select('*').limit(10);
      console.log('📊 Profiles:', profilesRes);
      
      // Test 3: Try to insert a test record
      console.log('🧪 Testing INSERT...');
      const testInsert = await supabase.from('profiles').insert({
        id: crypto.randomUUID(),
        user_id: 'test-user',
        tourist_id: 'TEST-001',
        username: 'Test User',
        email: 'test@example.com',
        status: 'safe'
      });
      console.log('🧪 INSERT result:', testInsert);
      
      // Test 4: Check other tables
      const alertsRes = await supabase.from('alerts').select('*').limit(10);
      console.log('🚨 Alerts:', alertsRes);
      
      const locationsRes = await supabase.from('user_locations').select('*').limit(10);
      console.log('📍 Locations:', locationsRes);
      
      const zonesRes = await supabase.from('danger_zones').select('*').limit(10);
      console.log('🛡️ Danger Zones:', zonesRes);
      
      setResult(JSON.stringify({
        connection: {
          url: supabase.supabaseUrl,
          status: pingError ? 'FAILED' : 'SUCCESS',
          error: pingError?.message || 'none'
        },
        profiles: {
          count: profilesRes.data?.length || 0,
          error: profilesRes.error?.message || 'none'
        },
        testInsert: {
          success: !testInsert.error,
          error: testInsert.error?.message || 'none'
        },
        alerts: {
          count: alertsRes.data?.length || 0,
          error: alertsRes.error?.message || 'none'
        },
        locations: {
          count: locationsRes.data?.length || 0,
          error: locationsRes.error?.message || 'none'
        },
        zones: {
          count: zonesRes.data?.length || 0,
          error: zonesRes.error?.message || 'none'
        }
      }, null, 2));
    } catch (error: any) {
      console.error('❌ Test failed:', error);
      setResult('Error: ' + (error as Error).message + '\n\nCheck browser console for details.');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 container mx-auto px-4">
      <h1 className="font-display text-3xl font-bold mb-4">Database Connection Test</h1>
      <button
        onClick={testConnection}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg mb-4"
      >
        Test Connection
      </button>
      <pre className="p-4 bg-muted rounded-lg overflow-auto">
        {result || 'Click "Test Connection" to check database...'}
      </pre>
    </div>
  );
};

export default TestDatabase;
