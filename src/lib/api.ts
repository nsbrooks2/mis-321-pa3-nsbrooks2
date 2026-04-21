import { supabase } from '../lib/supabase';

export async function fetchWithAuth(url: string, options: any = {}) {
  if (!supabase) throw new Error("Supabase not configured");
  
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json'
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return fetch(url, { ...options, headers });
}
