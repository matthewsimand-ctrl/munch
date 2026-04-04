import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { supabase, setAuthPersistence } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MunchLogo } from "@/components/MunchLogo";
import { isNativeAppPlatform } from "@/lib/platform";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const authMode = new URLSearchParams(location.search).get("mode");
  const [isLogin, setIsLogin] = useState(authMode === "signup" ? false : true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(authMode === "reset");
  const nextPath = new URLSearchParams(location.search).get("next") || "/dashboard";
  const isNativeApp = isNativeAppPlatform();
  const isResetMode = authMode === "reset" || recoveryMode;

  useEffect(() => {
    setIsLogin(authMode === "signup" ? false : true);
    setRecoveryMode(authMode === "reset");
  }, [authMode]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        navigate("/auth?mode=reset", { replace: true });
        return;
      }

      if (session && (event as string) !== "PASSWORD_RECOVERY" && !isResetMode) {
        navigate(nextPath, { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isResetMode) navigate(nextPath, { replace: true });
    });

    return () => subscription.unsubscribe();
  }, [isResetMode, navigate, nextPath]);

  const handleResetPasswordRequest = async () => {
    if (!email.trim()) {
      toast({
        title: "Enter your email first",
        description: "Add the email tied to your account so we can send a reset link.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) throw error;

      toast({
        title: "Reset link sent",
        description: "Check your inbox for the password reset email from munch.",
      });
    } catch (err: any) {
      toast({ title: "Unable to send reset email", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been reset. You can keep cooking.",
      });
      navigate(nextPath, { replace: true });
    } catch (err: any) {
      toast({ title: "Unable to update password", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      setAuthPersistence(keepLoggedIn);

      if (!isLogin && password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure both passwords are the same.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          if (
            error.message.includes("Invalid login credentials") ||
            error.message.includes("invalid_credentials")
          ) {
            toast({
              title: "Invalid credentials",
              description: "The email or password you entered is incorrect. Please try again or create a new account.",
              variant: "destructive",
            });
            return;
          }

          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth${nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""}`,
          },
        });

        if (error) {
          if (error.message.includes("already registered") || error.message.includes("already exists")) {
            toast({
              title: "Account already exists",
              description: "An account with this email already exists. Try signing in instead.",
            });
            setIsLogin(true);
            return;
          }

          throw error;
        }

        if (data.user && !data.session) {
          toast({
            title: "Check your email",
            description: "munch sent you a confirmation link. Please check your inbox.",
          });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (isNativeApp) {
      toast({
        title: "Google sign-in unavailable in mobile preview",
        description: "Lovable-managed Google auth only works on Lovable Cloud routes. Use email sign-in here, or wire native auth through Supabase or your own OAuth provider.",
        variant: "destructive",
      });
      return;
    }

    setAuthPersistence(keepLoggedIn);
    const redirectUri = `${window.location.origin}/auth${nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
    const error = "error" in result ? result.error : null;

    if (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_24%),linear-gradient(180deg,#fffaf5_0%,#fff7ed_48%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center">
          <div className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_30px_80px_rgba(28,25,23,0.12)] backdrop-blur sm:p-8">
            <div className="text-center">
              <MunchLogo className="mb-3 justify-center" size={62} wordmarkClassName="font-display text-3xl font-semibold text-foreground" />
              <p className="mt-1 text-sm text-muted-foreground">
                {isResetMode ? "Choose a new password" : isLogin ? "Welcome back, chef!" : "Create your account"}
              </p>
            </div>

            {!isResetMode && (
              <>
                <div className="mt-8 space-y-3">
                  <Button variant="outline" className="h-12 w-full" onClick={handleGoogle}>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">or</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={isResetMode ? handlePasswordUpdate : handleEmailAuth} className="space-y-4">
              {!isResetMode && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chef@example.com"
                  required
                  className="h-12"
                />
              </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{isResetMode ? "New Password" : "Password"}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-12"
                />
              </div>

              {(!isLogin || isResetMode) && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="h-12"
                  />
                </div>
              )}

              {!isResetMode && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2.5">
                  <label htmlFor="keep-logged-in" className="text-sm font-medium text-stone-700">
                    Keep me logged in
                  </label>
                  <Checkbox
                    id="keep-logged-in"
                    checked={keepLoggedIn}
                    onCheckedChange={(checked) => setKeepLoggedIn(checked === true)}
                  />
                </div>
              )}

              {isLogin && !isResetMode && (
                <button
                  type="button"
                  onClick={() => void handleResetPasswordRequest()}
                  className="text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
                >
                  Reset password
                </button>
              )}

              <Button type="submit" className="h-12 w-full" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Loading..." : isResetMode ? "Update Password" : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            {!isResetMode && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline">
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </p>
            )}
          </div>

          <div className="hidden space-y-5 lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-500">What munch does</p>
            <div className="space-y-4">
              <h1 className="font-display text-5xl font-semibold leading-[0.98] text-stone-900">
                Build a calmer, smarter cooking routine with munch.
              </h1>
              <p className="max-w-xl text-base leading-7 text-stone-600">
                munch helps you save recipes, keep track of what is in your kitchen, plan meals for the week, and move into cooking mode without bouncing between disconnected tools.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Save recipes once",
                  body: "Keep imports, favorites, and go-to meals together in one library you can actually use.",
                },
                {
                  title: "Cook from what you have",
                  body: "Use your pantry and grocery flow to make dinner decisions with less waste and less friction.",
                },
                {
                  title: "Stay in one flow",
                  body: "Move from discovery to planning to step-by-step cooking without losing context.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-[0_18px_48px_rgba(28,25,23,0.07)]"
                >
                  <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-500">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
