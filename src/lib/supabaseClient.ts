import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nrigdgdiqjdzieryjjod.supabase.co";
// استخدم الـ Anon Key فقط (الذي يبدأ بـ eyJ...)
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaWdkZ2RpcWpkemllcnlqam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njg3MTIsImV4cCI6MjA5NjM0NDcxMn0.9YMt8Vxy4lJ_7RBpjvBd9Gv9TB-AFv88U6pDoH9A3Fo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);