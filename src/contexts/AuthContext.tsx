import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { authService } from '@/lib/authService';
import { toast } from '@/hooks/use-toast';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthError = (error: AuthError, context: string) => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Incorrect email or password.',
      'User already registered': 'An account with this email already exists. Try logging in instead.',
      'Password should be at least 6 characters': 'Password must be at least 6 characters.',
      'Rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
      // Handle common rate limit messages that might come from Supabase
      'Too many requests': 'Too many attempts. Please wait a few minutes before trying again.',
      'too many attempts': 'Too many attempts. Please wait a few minutes before trying again.',
      'rate limit': 'Rate limit reached. Please wait a few minutes before trying again.',
    };

    // Check if the error message contains any rate limit related keywords
    const isRateLimitError = error.message.toLowerCase().includes('rate limit') || 
                             error.message.toLowerCase().includes('too many');

    const message = isRateLimitError 
      ? 'Rate limit exceeded. Please wait a few minutes before trying again.' 
      : errorMap[error.message] || error.message || `Error during ${context}`;
    
    console.error(`Auth error (${context}):`, error);
    toast({
      title: isRateLimitError ? `Rate Limit Reached` : `Authentication Error`,
      description: message,
      variant: "destructive",
      duration: 5000, // Show longer for rate limit errors
    });
    
    throw error;
  };

  useEffect(() => {
    // Check for active session on mount
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get current session
        const currentSession = await authService.getSession();
        setSession(currentSession);
        
        // If we have a session, get the user
        if (currentSession) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: authListener } = authService.onAuthStateChange(async (newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
    });

    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { session: newSession, user: newUser } = await authService.signInWithEmail(email, password);
      setSession(newSession);
      setUser(newUser);
      
      if (newUser) {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      // If rate limit error during login, suggest trying another method
      if (error.message.toLowerCase().includes('rate limit') || 
          error.message.toLowerCase().includes('too many')) {
        toast({
          title: "Rate Limit Reached",
          description: "Try signing in with Google instead, or wait a few minutes.",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        handleAuthError(error, 'sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email/password
  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { session: newSession, user: newUser } = await authService.signUpWithEmail(email, password);
      
      // Automatically set the session and user
      setSession(newSession);
      setUser(newUser);
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
    } catch (error: any) {
      // Special handling for potential rate limit or user already exists errors during signup
      if (error.message.toLowerCase().includes('rate limit') || 
          error.message.toLowerCase().includes('too many')) {
        toast({
          title: "Rate Limit Reached",
          description: "Try signing up with Google instead, or wait a few minutes.",
          variant: "destructive",
          duration: 8000,
        });
      } else if (error.message.includes('already registered')) {
        // If user already exists, suggest they might want to log in instead
        toast({
          title: "Account Already Exists",
          description: "Try logging in instead, or use a different email address.",
          variant: "destructive",
        });
      } else {
        handleAuthError(error, 'sign up');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      await authService.signInWithGoogle(redirectTo);
      // Note: The actual session update will happen via onAuthStateChange
    } catch (error: any) {
      handleAuthError(error, 'Google sign in');
    }
  };

  // Sign out
  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setSession(null);
      setUser(null);
      
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      handleAuthError(error, 'sign out');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await authService.resetPassword(email);
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error: any) {
      handleAuthError(error, 'password reset');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 