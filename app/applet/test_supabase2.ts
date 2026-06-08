import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in vite env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { count: participantsCount, error: pErr } = await supabase.from('participants').select('*', { count: 'exact', head: true });
  const { count: ordersCount, error: oErr } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: activityCount, error: aErr } = await supabase.from('activityTeams').select('*', { count: 'exact', head: true });
  const { count: resultsCount, error: rErr } = await supabase.from('results').select('*', { count: 'exact', head: true });
  const { count: regCount, error: regErr } = await supabase.from('registrations').select('*', { count: 'exact', head: true });
  
  console.log('participants:', participantsCount, pErr?.message);
  console.log('orders:', ordersCount, oErr?.message);
  console.log('activityTeams:', activityCount, aErr?.message);
  console.log('results:', resultsCount, rErr?.message);
  console.log('registrations:', regCount, regErr?.message);
}

run();
