import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { MunchLogo } from '@/components/MunchLogo';
import { AvatarStudio } from '@/components/AvatarStudio';
import { isValidUsername, normalizeUsername, suggestUsername } from '@/lib/username';
import {
  buildMunchAvatarUrl,
  createMunchAvatarConfig,
  type MunchAvatarConfig,
} from '@/lib/munchAvatar';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'None'];
const SKILL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const NO_PREFERENCE_OPTION = 'No preference';
const DISCOVERY_OPTIONS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'X / Twitter',
  'Facebook',
  'Word of mouth',
  'App Store search',
  'Google search',
  'Blog / article',
  'Other',
];
const FLAVOR_OPTIONS = ['Spicy', 'Sweet', 'Savory', 'Umami', 'Fresh/Citrusy', NO_PREFERENCE_OPTION];
const CUISINE_OPTIONS = [
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian',
  'Thai', 'Korean', 'Mediterranean', 'French', 'American',
  'Middle Eastern', 'Vietnamese', 'Greek', 'Ethiopian', 'Caribbean',
  NO_PREFERENCE_OPTION,
];
const COOKING_FOR_OPTIONS = [
  { value: '1', label: 'Solo', description: 'Just me', emoji: '🧑‍🍳' },
  { value: '2', label: 'Couple', description: 'Cooking for 2', emoji: '👫' },
  { value: '4', label: 'Family', description: 'Four servings', emoji: '👨‍👩‍👧‍👦' },
  { value: '8', label: 'Party', description: 'Cooking for a crowd', emoji: '🎉' },
];

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
    className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${selected
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

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';
  const {
    userProfile,
    setUserProfile,
    completeOnboarding,
    setDisplayName: setStoreDisplayName,
    setChefAvatarUrl,
  } = useStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [hasAccount, setHasAccount] = useState(false);
  const [defaultServings, setDefaultServings] = useState('2');
  const [discoverySource, setDiscoverySource] = useState('');
  const [discoverySourceDetail, setDiscoverySourceDetail] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<MunchAvatarConfig>(() =>
    createMunchAvatarConfig({ seed: 'MunchOnboarding' }),
  );
  const stepIndex = useMemo(() => ({
    name: 0,
    username: 1,
    discovery: 2,
    avatar: 3,
    servings: 4,
    dietary: 5,
    skill: 6,
    flavor: 7,
    cuisine: 8,
  }), []);

  const totalSteps = 9;

  const onboardingAvatarPreview = useMemo(() => buildMunchAvatarUrl(avatarConfig), [avatarConfig]);


  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      setHasAccount(Boolean(session));

      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, default_servings')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!active || !profile) return;

      if (profile.display_name) {
        setDisplayName(profile.display_name);
        setStoreDisplayName(profile.display_name);
      }

      if (profile.username) {
        setUsername(profile.username);
        setUsernameTouched(true);
      }

      if ((profile as any).default_servings) {
        setDefaultServings(String((profile as any).default_servings));
      }

      if ((profile as any).discovery_source) {
        setDiscoverySource(String((profile as any).discovery_source));
      }

      if ((profile as any).discovery_source_detail) {
        setDiscoverySourceDetail(String((profile as any).discovery_source_detail));
      }
    });

    return () => {
      active = false;
    };
  }, [setStoreDisplayName]);

  useEffect(() => {
    const normalized = normalizeUsername(username);
    if (!normalized || !isValidUsername(normalized)) {
      setUsernameStatus(username.trim().length === 0 ? 'idle' : 'invalid');
      return;
    }

    if (!hasAccount) {
      setUsernameStatus('available');
      return;
    }

    setUsernameStatus('checking');
    const timeout = window.setTimeout(() => {
      void supabase.rpc('is_username_available', { candidate: normalized }).then(({ data, error }) => {
        if (error) {
          setUsernameStatus('invalid');
          return;
        }
        setUsernameStatus(data ? 'available' : 'taken');
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [hasAccount, username]);

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
    if (item === NO_PREFERENCE_OPTION) {
      setUserProfile({ flavorProfiles: [NO_PREFERENCE_OPTION] });
      return;
    }
    const current = userProfile.flavorProfiles ?? [];
    setUserProfile({
      flavorProfiles: current.includes(item)
        ? current.filter(f => f !== item)
        : [...current.filter(f => f !== NO_PREFERENCE_OPTION), item],
    });
  };

  const toggleCuisine = (item: string) => {
    if (item === NO_PREFERENCE_OPTION) {
      setUserProfile({ cuisinePreferences: [NO_PREFERENCE_OPTION] });
      return;
    }
    const current = userProfile.cuisinePreferences ?? [];
    setUserProfile({
      cuisinePreferences: current.includes(item)
        ? current.filter(c => c !== item)
        : [...current.filter(c => c !== NO_PREFERENCE_OPTION), item],
    });
  };

  const canProceed =
    (step === stepIndex.name && displayName.trim().length > 0) ||
    (step === stepIndex.username && usernameStatus === 'available') ||
    (step === stepIndex.discovery && discoverySource !== '' && (discoverySource !== 'Other' || discoverySourceDetail.trim().length > 0)) ||
    (step === stepIndex.avatar) ||
    (step === stepIndex.servings && defaultServings !== '') ||
    (step === stepIndex.dietary && (userProfile.dietaryRestrictions ?? []).length > 0) ||
    (step === stepIndex.skill && userProfile.skillLevel !== '') ||
    (step === stepIndex.flavor && (userProfile.flavorProfiles ?? []).length > 0) ||
    (step === stepIndex.cuisine && (userProfile.cuisinePreferences ?? []).length > 0);

  const next = async () => {
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep(step + 1);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: normalizeUsername(username),
          default_servings: parseInt(defaultServings) || 2,
          discovery_source: discoverySource || null,
          discovery_source_detail: discoverySource === 'Other' ? discoverySourceDetail.trim() || null : null,
          avatar_url: onboardingAvatarPreview,
        } as any)
        .eq('user_id', session.user.id);
    }

    setChefAvatarUrl(onboardingAvatarPreview);
    setStoreDisplayName(displayName.trim());
    completeOnboarding();
    useStore.setState({ showTutorial: true });
    navigate(nextPath, { replace: true });
  };

  const back = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const usernameHelperText = usernameStatus === 'checking'
    ? 'Checking availability...'
    : usernameStatus === 'available'
      ? `@${normalizeUsername(username)} is available`
      : usernameStatus === 'taken'
        ? 'That username is already taken'
        : usernameStatus === 'invalid'
          ? 'Use 3-24 lowercase letters, numbers, or underscores'
          : 'This will be how people find you in Munch';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <MunchLogo className="mb-6" size={38} wordmarkClassName="font-display text-xl font-bold text-foreground" />
        <Progress value={((step + 1) / totalSteps) * 100} className="h-2 bg-secondary" />
        <p className="text-xs text-muted-foreground mt-2">Step {step + 1} of {totalSteps}</p>
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
              {step === stepIndex.name && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    What should we call you?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    We'll use this as your chef display name.
                  </p>
                  <Input
                    value={displayName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDisplayName(value);
                      if (!usernameTouched) {
                        setUsername(suggestUsername(value));
                      }
                    }}
                    placeholder="Your name"
                    className="text-lg h-14"
                    maxLength={50}
                    autoFocus
                  />
                </div>
              )}

              {hasAccount && step === stepIndex.username && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    Pick your username
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    People will use this to find and invite you. It needs to be unique.
                  </p>
                  <Input
                    value={username}
                    onChange={(e) => {
                      setUsernameTouched(true);
                      setUsername(normalizeUsername(e.target.value));
                    }}
                    placeholder="chefname"
                    className="text-lg h-14"
                    maxLength={24}
                    autoFocus
                  />
                  <p className={`mt-3 text-sm flex items-center gap-2 ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {usernameHelperText}
                  </p>
                </div>
              )}

              {!hasAccount && step === stepIndex.username && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    Pick your username
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    This becomes your Munch handle once you create an account.
                  </p>
                  <Input
                    value={username}
                    onChange={(e) => {
                      setUsernameTouched(true);
                      setUsername(normalizeUsername(e.target.value));
                    }}
                    placeholder="chefname"
                    className="text-lg h-14"
                    maxLength={24}
                    autoFocus
                  />
                  <p className={`mt-3 text-sm flex items-center gap-2 ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {usernameHelperText}
                  </p>
                </div>
              )}

              {step === stepIndex.discovery && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    How did you hear about Munch?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    This helps us understand which channels are working.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {DISCOVERY_OPTIONS.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        selected={discoverySource === option}
                        onClick={() => setDiscoverySource(option)}
                      />
                    ))}
                  </div>
                  {discoverySource === 'Other' && (
                    <Input
                      value={discoverySourceDetail}
                      onChange={(e) => setDiscoverySourceDetail(e.target.value)}
                      placeholder="Tell us where you found us"
                      className="mt-5 h-12"
                      autoFocus
                    />
                  )}
                </div>
              )}

              {step === stepIndex.avatar && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                      Pick your chef look
                    </h1>
                    <p className="text-muted-foreground mb-6">
                      Build a warmer, sharper Munch avatar with DiceBear styles that you can actually customize.
                    </p>
                  </div>

                  <AvatarStudio
                    config={avatarConfig}
                    onChange={(updates) =>
                      setAvatarConfig((current) =>
                        createMunchAvatarConfig({
                          ...current,
                          ...updates,
                          seed: updates.seed ?? current.seed ?? 'MunchOnboarding',
                        }),
                      )
                    }
                  />
                </div>

              )}

              {step === stepIndex.servings && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    Who are you cooking for?
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    We'll set this as your default serving size.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {COOKING_FOR_OPTIONS.map((option) => {
                      const isSelected = defaultServings === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDefaultServings(option.value)}
                          className={`p-4 rounded-xl text-left transition-all border group ${isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                            : 'bg-card text-foreground border-border hover:border-primary/50 hover:shadow-sm'
                            }`}
                        >
                          <span className="text-2xl mb-2 block">{option.emoji}</span>
                          <span className="font-semibold text-base block">{option.label}</span>
                          <span className={`text-sm block mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === stepIndex.dietary && (
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

              {step === stepIndex.skill && (
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
                        className={`p-4 rounded-lg text-left font-medium transition-all border ${userProfile.skillLevel === opt
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

              {step === stepIndex.flavor && (
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

              {step === stepIndex.cuisine && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    What cuisines excite you?
                  </h1>
                  <p className="text-muted-foreground mb-4">
                    Pick your favorites — we'll prioritize these in your feed.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-6">
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
        {step === stepIndex.avatar && (
          <Button
            variant="outline"
            onClick={() => {
              setDirection(1);
              setStep(step + 1);
            }}
            className="flex-shrink-0"
          >
            Skip for now
          </Button>
        )}
        <Button
          onClick={next}
          disabled={!canProceed}
          className="flex-1 h-12 text-base font-semibold"
        >
          {step === totalSteps - 1 ? "Let's Go!" : 'Continue'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
