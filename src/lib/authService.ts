import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';

// Authentication service built on top of Supabase
export const authService = {
  /**
   * Get the current user's session
   */
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          email_confirmed: true,
        }
      }
    });

    if (error) {
      throw error;
    }

    // If no session was created, try to directly sign in
    if (!data.session) {
      return await this.signInWithEmail(email, password);
    }

    return data;
  },

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(redirectTo?: string) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo ? 
          `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` : 
          `${window.location.origin}/auth/callback`,
        scopes: 'email profile',
      },
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }

    return true;
  },

  /**
   * Send a password reset email
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }

    return true;
  },

  /**
   * Update user password
   */
  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Update user profile data
   */
  async updateProfile(user_id: string, updates: { full_name?: string, avatar_url?: string }) {
    // First check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Insert new profile
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user_id,
            ...updates,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session);
    });
  }
}; 