import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Ensure these variables are set in your .env or replace them directly
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { count: participantsCount } = await supabase.from('participants').select('*', { count: 'exact', head: true });
  const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: activityCount } = await supabase.from('activityTeams').select('*', { count: 'exact', head: true });
  const { count: resultsCount } = await supabase.from('results').select('*', { count: 'exact', head: true });
  
  console.log('participants:', participantsCount);
  console.log('orders:', ordersCount);
  console.log('activityTeams:', activityCount);
  console.log('results:', resultsCount);
}

run();
