import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: any = null;

if (supabaseUrl && supabaseUrl.startsWith('http')) {
  client = createClient(supabaseUrl, supabaseKey);
}

export const supabase = client;
