import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import StyledAuthForm from '@/components/auth/StyledAuthForm';
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
    <div className="min-h-screen w-full flex items-center justify-center py-16">
      <StyledAuthForm initialMode={initialMode} redirectTo={redirectTo} />
    </div>
  );
};

export default Auth;