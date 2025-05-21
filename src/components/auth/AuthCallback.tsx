import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string>('/dashboard');
  const location = useLocation();

  useEffect(() => {
    // Get redirect destination from different sources
    const getRedirectDestination = () => {
      // First check URL query parameters
      const urlParams = new URLSearchParams(location.search);
      const queryRedirect = urlParams.get('redirectTo');
      if (queryRedirect) return queryRedirect;
      
      // Then check URL hash for OAuth redirects
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const hashRedirect = hashParams.get('redirectTo');
      if (hashRedirect) return hashRedirect;
      
      // Finally check localStorage for temp storage
      const storedRedirect = localStorage.getItem('auth_redirect');
      if (storedRedirect) {
        localStorage.removeItem('auth_redirect'); // Clean up
        return storedRedirect;
      }
      
      // Default to dashboard
      return '/dashboard';
    };
    
    setRedirectTo(getRedirectDestination());

    const handleCallback = async () => {
      try {
        setLoading(true);
        
        // Process the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (!data.session) {
          throw new Error('No session found');
        }
        
        // Success message
        toast({
          title: "Successfully authenticated",
          description: "You are now signed in.",
        });
        
      } catch (err: any) {
        console.error('Error during auth callback:', err);
        setError(err.message || 'Authentication failed');
        
        toast({
          title: "Authentication Failed",
          description: err.message || "Could not complete the authentication process",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-auth-gradient">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg">Finalizing authentication...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-auth-gradient">
        <div className="p-6 bg-card rounded-lg shadow-lg border border-border max-w-md text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Authentication Error</h2>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <a 
            href="/auth" 
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
          >
            Return to Login
          </a>
        </div>
      </div>
    );
  }

  // Successful auth - redirect to the destination
  return <Navigate to={redirectTo} replace />;
} 