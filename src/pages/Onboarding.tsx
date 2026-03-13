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
import { isValidUsername, normalizeUsername, suggestUsername } from '@/lib/username';
import defaultChefAvatar from '@/assets/chef-avatar.png';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'None'];
const SKILL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const NO_PREFERENCE_OPTION = 'No preference';
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
    chefAvatarUrl,
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
  const [avatarSkinTone, setAvatarSkinTone] = useState('#F5C9A9');
  const [avatarHair, setAvatarHair] = useState('short');
  const [avatarHairColor, setAvatarHairColor] = useState('#3F2A1D');
  const [avatarShirtColor, setAvatarShirtColor] = useState('#EA580C');
  const [avatarAccessory, setAvatarAccessory] = useState('none');

  const stepIndex = useMemo(() => ({
    name: 0,
    username: hasAccount ? 1 : -1,
    avatar: hasAccount ? 2 : 1,
    servings: hasAccount ? 3 : 2,
    dietary: hasAccount ? 4 : 3,
    skill: hasAccount ? 5 : 4,
    flavor: hasAccount ? 6 : 5,
    cuisine: hasAccount ? 7 : 6,
  }), [hasAccount]);

  const totalSteps = hasAccount ? 8 : 7;

  const AVATAR_PRESETS = [
    defaultChefAvatar,
    'https://api.dicebear.com/9.x/adventurer/svg?seed=ChefMunch',
    'https://api.dicebear.com/9.x/notionists/svg?seed=KitchenHero',
    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Foodie',
  ];

  const buildCustomAvatar = () => {
    const hairStyle = avatarHair === 'short'
      ? `<path d='M34 36c6-10 26-10 32 0v6H34z' fill='${avatarHairColor}' />`
      : avatarHair === 'curly'
        ? `<path d='M33 40c1-12 33-14 35 0l-1 5H34z' fill='${avatarHairColor}' /><circle cx='38' cy='38' r='4' fill='${avatarHairColor}' /><circle cx='62' cy='38' r='4' fill='${avatarHairColor}' />`
        : `<path d='M30 42c3-13 37-13 40 0v7H30z' fill='${avatarHairColor}' />`;
    const accessory = avatarAccessory === 'glasses'
      ? "<circle cx='43' cy='58' r='5' fill='none' stroke='#3A3A3A' stroke-width='1.5'/><circle cx='57' cy='58' r='5' fill='none' stroke='#3A3A3A' stroke-width='1.5'/><path d='M48 58h4' stroke='#3A3A3A' stroke-width='1.5'/>"
      : avatarAccessory === 'hat'
        ? "<rect x='32' y='30' width='36' height='8' rx='3' fill='#FFFFFF'/><rect x='39' y='24' width='22' height='8' rx='3' fill='#FFFFFF'/>"
        : '';

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect width='100' height='100' rx='20' fill='#FFF7ED' />
      <circle cx='50' cy='57' r='18' fill='${avatarSkinTone}' />
      ${hairStyle}
      <circle cx='44' cy='58' r='1.7' fill='#1C1917' />
      <circle cx='56' cy='58' r='1.7' fill='#1C1917' />
      <path d='M45 66c3 2 7 2 10 0' stroke='#1C1917' stroke-width='1.8' stroke-linecap='round' fill='none'/>
      ${accessory}
      <path d='M26 100c2-17 13-24 24-24s22 7 24 24' fill='${avatarShirtColor}' />
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

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
    });

    return () => {
      active = false;
    };
  }, [setStoreDisplayName]);

  useEffect(() => {
    if (!hasAccount) return;

    const normalized = normalizeUsername(username);
    if (!normalized || !isValidUsername(normalized)) {
      setUsernameStatus(username.trim().length === 0 ? 'idle' : 'invalid');
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
    (hasAccount && step === stepIndex.username && usernameStatus === 'available') ||
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
        } as any)
        .eq('user_id', session.user.id);
    }

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

              {step === stepIndex.avatar && (
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    Customize your avatar
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    Optional for now. Pick one you like or skip and come back later.
                  </p>

                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">Choose a ready-made avatar</p>
                      <div className="grid grid-cols-4 gap-2">
                        {AVATAR_PRESETS.map((preset) => {
                          const selected = chefAvatarUrl === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setChefAvatarUrl(preset)}
                              className={`rounded-2xl overflow-hidden border-2 transition-colors ${selected ? 'border-orange-400' : 'border-stone-200 hover:border-orange-200'}`}
                            >
                              <img src={preset} alt="Avatar preset" className="w-full h-16 object-cover bg-orange-50" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">Or build your own</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <label className="space-y-1">
                          <span className="font-semibold text-stone-600">Skin tone</span>
                          <input type="color" value={avatarSkinTone} onChange={(e) => setAvatarSkinTone(e.target.value)} className="w-full h-10 rounded" />
                        </label>
                        <label className="space-y-1">
                          <span className="font-semibold text-stone-600">Hair color</span>
                          <input type="color" value={avatarHairColor} onChange={(e) => setAvatarHairColor(e.target.value)} className="w-full h-10 rounded" />
                        </label>
                        <label className="space-y-1">
                          <span className="font-semibold text-stone-600">Shirt color</span>
                          <input type="color" value={avatarShirtColor} onChange={(e) => setAvatarShirtColor(e.target.value)} className="w-full h-10 rounded" />
                        </label>
                        <label className="space-y-1">
                          <span className="font-semibold text-stone-600">Hair style</span>
                          <select value={avatarHair} onChange={(e) => setAvatarHair(e.target.value)} className="w-full h-10 rounded border border-stone-200 px-2 bg-white">
                            <option value="short">Short</option>
                            <option value="curly">Curly</option>
                            <option value="long">Long</option>
                          </select>
                        </label>
                        <label className="space-y-1 col-span-2">
                          <span className="font-semibold text-stone-600">Accessory</span>
                          <select value={avatarAccessory} onChange={(e) => setAvatarAccessory(e.target.value)} className="w-full h-10 rounded border border-stone-200 px-2 bg-white">
                            <option value="none">None</option>
                            <option value="glasses">Glasses</option>
                            <option value="hat">Chef hat</option>
                          </select>
                        </label>
                      </div>
                      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-3">
                        <img src={buildCustomAvatar()} alt="Custom avatar preview" className="w-16 h-16 rounded-full border border-stone-200" />
                        <Button type="button" variant="outline" onClick={() => setChefAvatarUrl(buildCustomAvatar())}>
                          Use this avatar
                        </Button>
                      </div>
                    </div>
                  </div>
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
