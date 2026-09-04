import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nrigdgdiqjdzieryjjod.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaWdkZ2RpcWpkemllcnlqam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njg3MTIsImV4cCI6MjA5NjM0NDcxMn0.9YMt8Vxy4lJ_7RBpjvBd9Gv9TB-AFv88U6pDoH9A3Fo";

// Resilient fetch wrapper with automatic retry on network errors (e.g. TypeError: Failed to fetch) and server transient errors
const resilientFetch: typeof fetch = async (input, init) => {
  const maxRetries = 4;
  let attempt = 0;
  let delay = 400;

  while (true) {
    try {
      const response = await fetch(input, init);
      if (response.status >= 502 && response.status <= 504 && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.8;
        continue;
      }
      return response;
    } catch (err: any) {
      attempt++;
      const isNetworkError = 
        err instanceof TypeError || 
        (err?.name === 'TypeError') ||
        (err?.message && (
          err.message.toLowerCase().includes('fetch') ||
          err.message.toLowerCase().includes('network') ||
          err.message.toLowerCase().includes('abort') ||
          err.message.toLowerCase().includes('connection')
        ));

      if (attempt < maxRetries && isNetworkError) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.8;
      } else {
        throw err;
      }
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    fetch: resilientFetch
  }
});

