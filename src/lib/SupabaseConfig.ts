import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Supabase configuration
export const SupabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey
};

// Create and export the supabase client
// Note: This is used for data storage only, authentication is handled by Clerk
export const supabase = createClient(SupabaseConfig.url, SupabaseConfig.anonKey, {
  auth: {
    // Disable Supabase auth since we're using Clerk
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
}); 