import { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Props {
  initialMode?: 'signin' | 'signup';
  redirectTo?: string;
}

const AuthModern: React.FC<Props> = ({ initialMode = 'signin', redirectTo = '/dashboard' }) => {
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const disabled = submitting || loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (!error) window.location.href = redirectTo;
      } else {
        const { error } = await signUp(email, password);
        if (!error) window.location.href = redirectTo;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    await signInWithGoogle();
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />

      <div className="relative z-10 container mx-auto grid grid-cols-1 lg:grid-cols-2 min-h-[100dvh] items-center gap-10 px-6 py-10">
        {/* Brand / Hero */}
        <div className="hidden lg:flex flex-col gap-6">
          <div className="inline-flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center">
              <span className="text-primary text-xl">🧠</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">MindMate</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Your daily companion for emotional wellbeing
          </h1>
          <p className="text-muted-foreground text-lg max-w-[48ch]">
            Track your mood, journal with AI insights, and discover calming resources — all in one beautiful experience.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Stat label="Journals analyzed" value="120k+" />
            <Stat label="Avg. satisfaction" value="4.8/5" />
            <Stat label="Global users" value="35k+" />
          </div>
        </div>

        {/* Card */}
        <Card className="mx-auto w-full max-w-md backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <CardHeader>
            <CardTitle className="text-2xl">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription>
              {mode === 'signin' ? 'Sign in to continue your journey' : 'Join MindMate to start your journey'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'signin' && (
                    <button type="button" className="text-xs text-primary hover:underline" onClick={()=>alert('Use the reset password option from your profile once signed in.')}>Forgot password?</button>
                  )}
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                  <button type="button" onClick={()=>setShowPassword(v=>!v)} className={cn('absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground hover:text-foreground text-xs')}>{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={disabled}>
                {mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </Button>
            </form>

            <div className="py-4">
              <Separator className="my-4" />
              <Button variant="outline" className="w-full" onClick={onGoogle} disabled={disabled}>
                <svg width="18" height="18" viewBox="0 0 48 48" className="mr-2"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12 c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.046,8.955,20,20,20 s20-8.954,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.818C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.243,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.197l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946 l-6.532,5.033C9.5,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.271,4.191-4.168,5.565c0.001-0.001,0.002-0.001,0.003-0.002 l6.19,5.238C36.972,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                Continue with Google
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <Button variant="ghost" onClick={()=>setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="text-2xl font-semibold">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

export default AuthModern;
