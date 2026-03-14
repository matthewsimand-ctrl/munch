import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Ghost } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MunchLogo } from '@/components/MunchLogo';
import { isNativeAppPlatform } from '@/lib/platform';
export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetStore } = useStore();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const nextPath = new URLSearchParams(location.search).get('next') || '/dashboard';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate(nextPath, { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(nextPath, { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate, nextPath]);

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      // Clear store to ensure a fresh experience
      resetStore();

      // Set local guest mode bypass
      const { setIsGuest } = useStore.getState();
      setIsGuest(true);

      console.log("Guest mode activated locally");
      toast({ title: "Guest Mode", description: "Taking you to onboarding..." });

      // Force navigation to onboarding
      navigate('/onboarding');
    } catch (err: any) {
      console.error("Guest login error:", err);
      toast({ title: 'Guest Login Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isLogin && password !== confirmPassword) {
        toast({ title: "Passwords don't match", description: 'Please make sure both passwords are the same.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (
            error.message.includes('Invalid login credentials') ||
            error.message.includes('invalid_credentials')
          ) {
            toast({
              title: 'Invalid credentials',
              description: 'The email or password you entered is incorrect. Please try again or create a new account.',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}` },
        });
        if (error) {
          // Handle "User already registered"
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            toast({
              title: 'Account already exists',
              description: 'An account with this email already exists. Try signing in instead.',
            });
            setIsLogin(true);
            return;
          }
          throw error;
        }
        // Check if email confirmation is needed
        if (data.user && !data.session) {
          toast({ title: 'Check your email', description: 'Munch sent you a confirmation link. Please check your inbox.' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (isNativeAppPlatform()) {
      toast({
        title: 'Google sign-in unavailable in mobile preview',
        description: 'Lovable-managed Google auth only works on Lovable Cloud routes. Use email or guest mode here, or wire native auth through Supabase/your own OAuth provider.',
        variant: 'destructive',
      });
      return;
    }

    const redirectUri = `${window.location.origin}/auth${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`;

    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: redirectUri });

    const error = 'error' in result ? result.error : null;
    if (error) toast({ title: 'Error', description: String(error), variant: 'destructive' });
  };

  const handleApple = async () => {
    if (isNativeAppPlatform()) {
      toast({
        title: 'Apple sign-in unavailable in mobile preview',
        description: 'Lovable-managed social auth does not run inside the local mobile preview. Use email or guest mode here, or add a native auth provider flow.',
        variant: 'destructive',
      });
      return;
    }

    const redirectUri = `${window.location.origin}/auth${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`;

    const result = await lovable.auth.signInWithOAuth('apple', { redirect_uri: redirectUri });

    const error = 'error' in result ? result.error : null;
    if (error) toast({ title: 'Error', description: String(error), variant: 'destructive' });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <MunchLogo className="justify-center mb-3" size={62} wordmarkClassName="font-display text-3xl font-bold text-foreground" />
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? 'Welcome back, chef!' : 'Create your account'}
          </p>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full h-12" onClick={handleGoogle}>
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <Button variant="outline" className="w-full h-12" onClick={handleApple}>
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </Button>
        </div>

        <Button variant="outline" className="w-full h-12 mt-3" onClick={handleGuestLogin} disabled={loading}>
          <Ghost className="h-4 w-4 mr-2" />
          Continue as Guest
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="chef@example.com" required className="h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-12" />
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-12" />
            </div>
          )}
          <Button type="submit" className="w-full h-12" disabled={loading}>
            <Mail className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
