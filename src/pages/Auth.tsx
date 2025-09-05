import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthModern from '@/components/auth/AuthModern';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const initialMode = (searchParams.get('mode') === 'signup' ? 'signup' : 'signin') as 'signin' | 'signup';

  if (user && !loading) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <AuthModern initialMode={initialMode} redirectTo={redirectTo} />
  );
};

export default Auth;