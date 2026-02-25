/**
 * Seed script to add Saravanampatti danger zone
 * Run with: bun run scripts/add-danger-zone.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addSaravanampattiDangerZone() {
  console.log('🚀 Adding Saravanampatti Danger Zone...');
  
  const zoneData = {
    name: 'Saravanampatti',
    lat: 11.08344,
    lng: 76.99720,
    radius: 1000,
    level: 'High',
  };

  const { data, error } = await supabase
    .from('danger_zones')
    .insert(zoneData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error adding danger zone:', error.message);
    process.exit(1);
  }

  console.log('✅ Danger zone added successfully!');
  console.log('📍 Name:', data.name);
  console.log('🌍 Coordinates:', data.lat, data.lng);
  console.log('📏 Radius:', data.radius, 'meters');
  console.log('⚠️  Risk Level:', data.level);
}

addSaravanampattiDangerZone();
