import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthCard } from '@/components/auth/AuthCard';
import { useAuth } from '@/contexts/AuthContext';
import './auth.css';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  // Get the redirect URL from query parameters or default to dashboard
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  
  // Check if mode is specified in URL params
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup') {
      setMode('signup');
    } else if (modeParam === 'login') {
      setMode('login');
    }
  }, [searchParams]);
  
  // Toggle between login and signup modes
  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };
  
  // If user is already logged in, redirect to the specified page
  if (user && !isLoading) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-auth-gradient">
      {/* Ambient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl opacity-50 animate-blob" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-3xl opacity-40 animate-blob animation-delay-2000" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-secondary/20 rounded-full blur-3xl opacity-30 animate-blob animation-delay-4000" />
      </div>
      
      <div className="relative w-full max-w-md px-4 py-12 flex flex-col items-center z-10">
        <div className="mb-8 text-center animate-fade-in">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {mode === 'login' ? 'Welcome Back' : 'Join MindMate'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'login' 
              ? 'Sign in to continue your mental wellness journey' 
              : 'Create an account to start your personal growth'}
          </p>
        </div>
        
        <div className="w-full animate-fade-up glass-auth-container">
          <AuthCard 
            mode={mode} 
            onToggleMode={toggleMode} 
            redirectUrl={redirectTo}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth; 