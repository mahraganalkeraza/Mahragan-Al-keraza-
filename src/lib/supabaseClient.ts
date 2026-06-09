import { createClient } from '@supabase/supabase-js';

// Clean the environment variable and ensure it's not empty, fallback to a valid URL string
const envUrl = String(import.meta.env.VITE_SUPABASE_URL || "");
const supabaseUrl = envUrl.startsWith("http") ? envUrl : "https://dummy.supabase.co";

const envKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "");
const supabaseAnonKey = envKey.length > 10 ? envKey : "dummy-anon-key-that-is-long-enough";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
