import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { onboardingComplete, isGuest } = useStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !isGuest) {
        navigate('/auth', { replace: true });
      } else if (!onboardingComplete) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      setChecked(true);
    });
  }, [onboardingComplete, isGuest, navigate]);

  return null;
};

export default Index;
