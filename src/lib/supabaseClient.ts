import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://nrigdgdiqjdzieryjjod.supabase.co';

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_pky-HtvFEvoQ5WbpfKa0RQ_EPupXDnx';

// ONLY use the safe, public anon key on the client side
export const supabase = createClient(supabaseUrl, supabaseKey);

