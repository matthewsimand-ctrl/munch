import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { onboardingComplete, isGuest, completeOnboarding, setDisplayName } = useStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session && !isGuest) {
        navigate('/auth', { replace: true });
        setChecked(true);
        return;
      }

      if (session && !onboardingComplete) {
        // Sync from DB if user is logging back in
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profile?.display_name) {
          setDisplayName(profile.display_name);
          completeOnboarding();
          // We don't return here, let the logic below handle navigation
        }
      }

      // Re-read from store as it might have been updated above
      const isComplete = onboardingComplete || !!isGuest;
      // Actually completeOnboarding() updates the store ref, but we need to check the current logic
      // If we called completeOnboarding(), the next render will have it. 
      // But for this effect run, we can just navigate directly if we found a profile.

      const { data: profileCheck } = session ? await supabase.from('profiles').select('display_name').eq('user_id', session.user.id).maybeSingle() : { data: null };

      if (profileCheck?.display_name || onboardingComplete) {
        navigate('/dashboard', { replace: true });
      } else if (isGuest) {
        // Guests go to onboarding first, then dashboard
        navigate(onboardingComplete ? '/dashboard' : '/onboarding', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }

      setChecked(true);
    };

    checkAuth();
  }, [onboardingComplete, isGuest, navigate, completeOnboarding, setDisplayName]);

  return null;
};

export default Index;
