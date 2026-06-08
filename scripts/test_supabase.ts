import { config } from 'dotenv';
config();
(global as any).import = { meta: { env: { VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY } } };
import { supabase } from '../src/lib/supabaseClient';

async function check() {
  const { data: pData, error: pErr } = await supabase.from('participants').select('id, name').limit(1);
  const { data: rData, error: rErr } = await supabase.from('registrations').select('id').limit(1);
  console.log('Participants:', pData, pErr?.message);
  console.log('Registrations:', rData, rErr?.message);
}
check();
