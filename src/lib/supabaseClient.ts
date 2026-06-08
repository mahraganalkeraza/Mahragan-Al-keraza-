import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://nrigdgdiqjdzieryjjod.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaWdkZ2RpcWpkemllcnlqam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njg3MTIsImV4cCI6MjA5NjM0NDtxMn0.9YMt8Vxy4lJ_7RBpjvBd9Gv9TB-AFv88U6pDoH9A3Fo';

const getValidSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  let finalUrl = fallbackUrl;
  let finalKey = fallbackKey;

  if (
    envUrl && 
    typeof envUrl === 'string' && 
    envUrl.trim() !== '' && 
    envUrl.trim() !== 'undefined' && 
    envUrl.trim() !== 'null' && 
    /^https?:\/\//i.test(envUrl.trim())
  ) {
    finalUrl = envUrl.trim();
  }

  if (
    envKey && 
    typeof envKey === 'string' && 
    envKey.trim() !== '' && 
    envKey.trim() !== 'undefined' && 
    envKey.trim() !== 'null' && 
    envKey.trim().length > 15
  ) {
    finalKey = envKey.trim();
  }

  return { supabaseUrl: finalUrl, supabaseKey: finalKey };
};

const { supabaseUrl, supabaseKey } = getValidSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseKey);

