import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, ArrowRight, ArrowLeft, Users } from 'lucide-react';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'None'];
const SKILL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const FLAVOR_OPTIONS = ['Spicy', 'Sweet', 'Savory', 'Umami', 'Fresh/Citrusy'];
const CUISINE_OPTIONS = [
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian',
  'Thai', 'Korean', 'Mediterranean', 'French', 'American',
  'Middle Eastern', 'Vietnamese', 'Greek', 'Ethiopian', 'Caribbean',
];
const TOTAL_STEPS = 6;

const Chip = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
      selected
        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
        : 'bg-card text-foreground border-border hover:border-primary/50 hover:shadow-sm'
    }`}
  >
    {label}
  </button>
);

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { userProfile, setUserProfile, completeOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [defaultServings, setDefaultServings] = useState('2');

  const toggleDietary = (item: string) => {
    const dietaryRestrictions = userProfile.dietaryRestrictions ?? [];
    if (item === 'None') {
      setUserProfile({ dietaryRestrictions: ['None'] });
      return;
    }
    const current = dietaryRestrictions.filter(d => d !== 'None');
    setUserProfile({
      dietaryRestrictions: current.includes(item)
        ? current.filter(d => d !== item)
        : [...current, item],
    });
  };

  const toggleFlavor = (item: string) => {
    const current = userProfile.flavorProfiles ?? [];
    setUserProfile({
      flavorProfiles: current.includes(item)
        ? current.filter(f => f !== item)
        : [...current, item],
    });
  };

  const toggleCuisine = (item: string) => {
    const current = userProfile.cuisinePreferences ?? [];
    setUserProfile({
      cuisinePreferences: current.includes(item)
        ? current.filter(c => c !== item)
        : [...current, item],
    });
  };

  const canProceed =
    (step === 0 && displayName.trim().length > 0) ||
    (step === 1 && defaultServings !== '') ||
    (step === 2 && (userProfile.dietaryRestrictions ?? []).length > 0) ||
    (step === 3 && userProfile.skillLevel !== '') ||
    (step === 4 && (userProfile.flavorProfiles ?? []).length > 0) ||
    (step === 5 && (userProfile.cuisinePreferences ?? []).length > 0);

  const next = async () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('profiles')
          .update({
            display_name: displayName.trim(),
            default_servings: parseInt(defaultServings) || 2,
          } as any)
          .eq('user_id', session.user.id);
      }
      completeOnboarding();
      navigate('/dashboard');
    }
  };

  const back = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <ChefHat className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">Munch</span>
        </div>
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} className="h-2 bg-secondary" />
        <p className="text-xs text-muted-foreground mt-2">Step {step + 1} of {TOTAL_STEPS}</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {step === 0 && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    What should we call you?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    We'll use this to personalize your experience.
                  </p>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="text-lg h-14"
                    maxLength={50}
                    autoFocus
                  />
                </div>
              )}

              {step === 1 && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    How many mouths to feed?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    We'll set this as your default serving size.
                  </p>
                  <Select value={defaultServings} onValueChange={setDefaultServings}>
                    <SelectTrigger className="w-full h-14 text-lg">
                      <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? 'serving' : 'servings'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    Any dietary needs?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    Select all that apply. We'll tailor your recipes.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {DIETARY_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        selected={(userProfile.dietaryRestrictions ?? []).includes(opt)}
                        onClick={() => toggleDietary(opt)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    What's your skill level?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    We'll match recipe difficulty to your comfort zone.
                  </p>
                  <div className="flex flex-col gap-3">
                    {SKILL_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setUserProfile({ skillLevel: opt })}
                        className={`p-4 rounded-lg text-left font-medium transition-all border ${
                          userProfile.skillLevel === opt
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-card text-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {opt}
                        <span className="block text-sm font-normal opacity-70 mt-0.5">
                          {opt === 'Beginner' && 'Simple recipes, minimal prep'}
                          {opt === 'Intermediate' && 'Some technique required'}
                          {opt === 'Advanced' && 'Bring on the challenge'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    Flavor cravings?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    Pick flavors you love — pick as many as you want.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {FLAVOR_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        selected={(userProfile.flavorProfiles ?? []).includes(opt)}
                        onClick={() => toggleFlavor(opt)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    What cuisines excite you?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    Pick your favorites — we'll prioritize these in your feed.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {CUISINE_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        selected={(userProfile.cuisinePreferences ?? []).includes(opt)}
                        onClick={() => toggleCuisine(opt)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto w-full flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={back} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Button
          onClick={next}
          disabled={!canProceed}
          className="flex-1 h-12 text-base font-semibold"
        >
          {step === TOTAL_STEPS - 1 ? "Let's Go!" : 'Continue'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
