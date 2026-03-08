import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { onboardingComplete, pantryList } = useStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth', { replace: true });
      } else if (!onboardingComplete) {
        navigate('/onboarding', { replace: true });
      } else if (pantryList.length === 0) {
        navigate('/pantry', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      setChecked(true);
    });
  }, [onboardingComplete, pantryList, navigate]);

  return null;
};

export default Index;
