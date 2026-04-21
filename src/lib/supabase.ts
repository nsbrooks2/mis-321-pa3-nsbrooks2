import { createClient } from '@supabase/supabase-js';

function sanitizeSupabaseUrl(url: string | undefined): string {
  if (!url) return "";
  let sanitized = url.trim();
  // Remove multiple trailing slashes
  sanitized = sanitized.replace(/\/+$/, "");
  // Remove /rest/v1 or /auth/v1 if the user accidentally included them in the base URL
  sanitized = sanitized.replace(/\/(rest|auth)\/v1$/, "");
  // Final check for trailing slash after replacement
  sanitized = sanitized.replace(/\/+$/, "");
  // Ensure it starts with https
  if (sanitized && !sanitized.startsWith('http')) {
    sanitized = `https://${sanitized}`;
  }
  return sanitized;
}

const supabaseUrl = sanitizeSupabaseUrl((import.meta as any).env.VITE_SUPABASE_URL);
const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || "").trim();

// Only initialize if we have the credentials to prevent app crash on load
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'apikey': supabaseAnonKey
        }
      }
    }) 
  : null;

if (!supabase) {
  console.warn('Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. Authentication and database features will be disabled. Please add them to your AI Studio Secrets.');
}
