import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';

const Index = () => {
  const navigate = useNavigate();
  const { onboardingComplete, pantryList } = useStore();

  useEffect(() => {
    if (!onboardingComplete) {
      navigate('/onboarding', { replace: true });
    } else if (pantryList.length === 0) {
      navigate('/pantry', { replace: true });
    } else {
      navigate('/swipe', { replace: true });
    }
  }, [onboardingComplete, pantryList, navigate]);

  return null;
};

export default Index;
