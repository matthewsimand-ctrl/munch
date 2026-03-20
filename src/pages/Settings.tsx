import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import { useBrowseFeed } from '@/hooks/useBrowseFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, LogOut, User, Users, Utensils, Trash2, Flame, Camera, ChefHat, Crown, MapPin, Compass, RotateCw, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useAiAgentCallsDisabled } from '@/hooks/useAiAgentCallsDisabled';
import { setAiAgentCallsDisabled } from '@/lib/ai';
import { getPremiumOverride, setPremiumOverride } from '@/lib/premium';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import RecipeScraperTester from '@/components/RecipeScraperTester';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isValidUsername, normalizeUsername } from '@/lib/username';
import { AvatarStudio } from '@/components/AvatarStudio';
import { applyRecipeImageFallback, getRecipeImageSrc } from '@/lib/recipeImage';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  buildMunchAvatarUrl,
  createMunchAvatarConfig,
  type MunchAvatarConfig,
} from '@/lib/munchAvatar';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'None'];
const SKILL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];
const NO_PREFERENCE_OPTION = 'No preference';
const FLAVOR_OPTIONS = ['Spicy', 'Sweet', 'Savory', 'Umami', 'Fresh/Citrusy', NO_PREFERENCE_OPTION];
const SERVING_OPTIONS = [
  { value: '1', label: 'Solo', description: 'Just me' },
  { value: '2', label: 'Couple', description: 'Cooking for 2' },
  { value: '4', label: 'Family', description: 'Four servings' },
  { value: '8', label: 'Party', description: 'Cooking for a crowd' },
];

function mapServingPreference(value: unknown): string {
  const numeric = Number.parseInt(String(value || 2), 10) || 2;
  const options = SERVING_OPTIONS.map((option) => Number.parseInt(option.value, 10));
  return String(options.reduce((closest, current) => (
    Math.abs(current - numeric) < Math.abs(closest - numeric) ? current : closest
  ), options[0]));
}

const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${selected
      ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
      : 'border-orange-200 bg-white/85 text-stone-700 hover:border-orange-300 hover:bg-orange-50'
      }`}
  >
    {label}
  </button>
);

function SettingsSectionLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">{title}</span>
    </div>
  );
}

function SettingsCard({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[1.75rem] border p-5 shadow-[0_10px_28px_rgba(28,25,23,0.05)] ${className}`}
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.98) 0%,rgba(255,249,243,0.98) 100%)", borderColor: "rgba(249,115,22,0.10)", ...style }}
    >
      {children}
    </div>
  );
}

export default function Settings() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openPremiumPage } = usePremiumGate();
  const {
    userProfile, setUserProfile, resetStore, resetTutorial,
    chefAvatarUrl, setChefAvatarUrl, shareCustomRecipesByDefault, setShareCustomRecipesByDefault,
    savedApiRecipes, mealPlan, dashboardHeroImageMode, dashboardHeroImageSeed,
    setDashboardHeroImageMode, setDashboardHeroImageSeed,
  } = useStore();
  const { recipes: browseRecipes, loadFeed } = useBrowseFeed();
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameEditUnlocked, setUsernameEditUnlocked] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [defaultServings, setDefaultServings] = useState(mapServingPreference(2));
  const [loading, setLoading] = useState(false);
  const aiAgentCallsDisabled = useAiAgentCallsDisabled();
  const [premiumOverrideEnabled, setPremiumOverrideEnabled] = useState(getPremiumOverride());
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [showResetTutorialConfirm, setShowResetTutorialConfirm] = useState(false);
  const [showUsernameChangeConfirm, setShowUsernameChangeConfirm] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [heroImagePickerOpen, setHeroImagePickerOpen] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<MunchAvatarConfig>(() => createMunchAvatarConfig());
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const membershipMetadata = user ? {
    ...(user.user_metadata || {}),
    ...(user.app_metadata || {}),
  } as Record<string, unknown> : {};
  const isPremiumPlan = Boolean(
    premiumOverrideEnabled
    || membershipMetadata.is_premium === true
    || membershipMetadata.premium === true
    || membershipMetadata.subscription_tier === 'premium'
    || membershipMetadata.plan === 'premium'
    || membershipMetadata.role === 'premium'
  );
  const premiumDateValue = [
    membershipMetadata.renewal_date,
    membershipMetadata.renews_at,
    membershipMetadata.current_period_end,
    membershipMetadata.subscription_end,
    membershipMetadata.plan_end_date,
  ].find((value) => typeof value === 'string' && value.trim()) as string | undefined;
  const formattedPremiumDate = premiumDateValue
    ? new Date(premiumDateValue).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth', { replace: true });
        return;
      }
      setUser(session.user);
      supabase
        .from('profiles')
        .select('display_name, username, default_servings')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name || '');
            const persistedUsername = (data as any).username || '';
            setUsername(persistedUsername);
            setOriginalUsername(persistedUsername);
            setDefaultServings(mapServingPreference((data as any).default_servings));
          }
        });
    });
  }, [navigate]);

  useEffect(() => {
    if (originalUsername && !usernameEditUnlocked) {
      setUsernameStatus('idle');
      return;
    }

    const normalized = normalizeUsername(username);
    if (!normalized || !isValidUsername(normalized)) {
      setUsernameStatus(username.trim().length === 0 ? 'idle' : 'invalid');
      return;
    }

    if (normalized === originalUsername) {
      setUsernameStatus('idle');
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
  }, [originalUsername, username, usernameEditUnlocked]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const avatarBuilderPreview = buildMunchAvatarUrl(avatarConfig);
  const heroImageOptions = useMemo(
    () =>
      [...mealPlan.map((item) => item.recipeSnapshot).filter(Boolean), ...Object.values(savedApiRecipes), ...browseRecipes]
        .map((recipe: any) => getRecipeImageSrc(recipe?.image))
        .filter(Boolean)
        .filter((src, index, arr) => arr.indexOf(src) === index),
    [browseRecipes, mealPlan, savedApiRecipes],
  );
  const selectedHeroImageIndex = heroImageOptions.length > 0 ? dashboardHeroImageSeed % heroImageOptions.length : 0;
  const profileCompletionCount = [
    Boolean(displayName.trim()),
    Boolean(normalizeUsername(username)),
    Boolean(userProfile.skillLevel),
    userProfile.dietaryRestrictions.length > 0,
    userProfile.flavorProfiles.length > 0,
    Boolean(userProfile.groceryLocation.trim()),
  ].filter(Boolean).length;

  const toggleDietary = (item: string) => {
    if (item === 'None') {
      setUserProfile({ dietaryRestrictions: ['None'] });
      return;
    }
    const current = userProfile.dietaryRestrictions.filter(d => d !== 'None');
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

    const current = userProfile.flavorProfiles;
    setUserProfile({
      flavorProfiles: current.includes(item)
        ? current.filter(f => f !== item)
        : [...current.filter(f => f !== NO_PREFERENCE_OPTION), item],
    });
  };


  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `chef-avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('recipe-photos').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('recipe-photos').getPublicUrl(fileName);
      setChefAvatarUrl(publicUrl);
      toast({ title: 'Cook mode avatar updated' });
    } catch {
      toast({ title: 'Failed to upload avatar', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveAvatarDesign = () => {
    setChefAvatarUrl(avatarBuilderPreview);
    setAvatarDialogOpen(false);
    toast({ title: 'Avatar updated' });
  };

  const handleSave = async () => {
    let userId = user?.id;

    // Re-fetch session if user state is stale
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
      if (session?.user) setUser(session.user);
    }

    if (!userId) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    const usernameChanged = normalizedUsername !== originalUsername;

    if (!normalizedUsername || !isValidUsername(normalizedUsername)) {
      toast({ title: 'Choose a valid username', variant: 'destructive' });
      return;
    }

    if (usernameChanged && usernameStatus !== 'available') {
      toast({ title: 'Choose an available username', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        display_name: displayName.trim() || null,
        username: normalizedUsername,
        default_servings: parseInt(defaultServings) || 2,
        avatar_url: chefAvatarUrl,
      } as any, { onConflict: 'user_id' });

    setLoading(false);
    if (error) {
      console.error('Profile save error:', error);
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      setOriginalUsername(normalizedUsername);
      setUsername(normalizedUsername);
      setUsernameEditUnlocked(false);
      setUsernameStatus('idle');
      toast({ title: 'Settings saved! ✓' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetStore();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen pb-20" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "linear-gradient(180deg,#FFF7F1 0%,#FFFAF5 30%,#FFF4EA 100%)" }}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
        <div
          className="mb-8 overflow-hidden rounded-[2rem] border"
          style={{ background: "linear-gradient(135deg,#FFF1E6 0%,#FFFFFF 42%,#FFF7ED 100%)", borderColor: "rgba(249,115,22,0.12)", boxShadow: "0 18px 42px rgba(28,25,23,0.08)" }}
        >
          <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
            <div className="relative">
              <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-orange-100/70 blur-2xl" />
              <div className="absolute left-40 top-10 h-24 w-24 rounded-full bg-amber-100/70 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full border border-orange-100 bg-white/80 text-stone-700 hover:bg-orange-50">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-500">Kitchen settings</p>
                </div>
                <h1 className="mt-4 text-3xl font-bold text-stone-900 sm:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Shape your Munch home base.
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-stone-600 sm:text-[15px]">
                  Tune your chef identity, personalize the dashboard, and keep your cooking defaults aligned with the rest of your kitchen.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">Chef profile</p>
                    <p className="mt-1 text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      {displayName || 'Chef'}
                    </p>
                    <p className="text-xs text-stone-500">{originalUsername ? `@${originalUsername}` : 'Choose your kitchen handle'}</p>
                  </div>
                  <div className="rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">Profile completion</p>
                    <p className="mt-1 text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      {profileCompletionCount}/6 ready
                    </p>
                    <p className="text-xs text-stone-500">The more complete this is, the better Munch can tailor your experience.</p>
                  </div>
                </div>
              </div>
            </div>

            {!isMobile && (
              <div className="relative hidden lg:block">
                <div className="absolute inset-0 rounded-[1.8rem] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.72),transparent_32%),linear-gradient(145deg,rgba(249,115,22,0.14),rgba(255,255,255,0.5))]" />
                <div className="relative rounded-[1.8rem] border border-white/70 bg-white/75 p-5 shadow-[0_14px_30px_rgba(28,25,23,0.06)] backdrop-blur">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-[1.5rem] bg-orange-100 blur-xl" />
                      <img
                        src={chefAvatarUrl || '/placeholder.svg'}
                        alt="Chef avatar"
                        className="relative h-20 w-20 rounded-[1.5rem] border-2 border-white object-cover shadow-lg"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">Current kitchen</p>
                      <p className="mt-1 text-xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                        {displayName || 'Chef'}
                      </p>
                      <p className="text-sm text-stone-500">{user?.email || 'Signed in account'}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-orange-50/80 px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500">Plan</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">{isPremiumPlan ? 'Munch Member' : 'Munch Free'}</p>
                    </div>
                    <div className="rounded-2xl bg-stone-50 px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">Default servings</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">{SERVING_OPTIONS.find((option) => option.value === defaultServings)?.label || 'Couple'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:items-start">
          <div className="space-y-8">
            <section className="space-y-4">
              <SettingsSectionLabel icon={User} title="Profile" />
              <SettingsCard style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#FFF6EC 100%)" }}>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div>
                      <Label>Email</Label>
                      <p className="mt-2 text-sm font-medium text-stone-600">{user?.email || '—'}</p>
                    </div>
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        maxLength={50}
                        className="mt-2 h-11 rounded-xl border-orange-200 bg-white/92 text-stone-800 placeholder:text-stone-400"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="username">Username</Label>
                      {originalUsername && !usernameEditUnlocked && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUsernameChangeConfirm(true)}
                          className="h-8 rounded-full border-orange-200 px-3 text-xs text-orange-700 hover:bg-orange-50"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      )}
                    </div>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                      placeholder="chefname"
                      maxLength={24}
                      disabled={Boolean(originalUsername) && !usernameEditUnlocked}
                      className={`mt-2 h-11 rounded-xl border-orange-200 ${Boolean(originalUsername) && !usernameEditUnlocked ? 'bg-stone-50 text-stone-500' : 'bg-white/92 text-stone-800 placeholder:text-stone-400'}`}
                    />
                    <p className={`mt-2 text-xs ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-red-500' : 'text-stone-500'}`}>
                      {originalUsername && !usernameEditUnlocked && 'Your username is locked until you choose to edit it.'}
                      {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'checking' && 'Checking username...'}
                      {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'available' && `@${normalizeUsername(username)} is available`}
                      {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'taken' && 'That username is already taken'}
                      {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'invalid' && 'Use 3-24 lowercase letters, numbers, or underscores'}
                      {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'idle' && 'People can use this to find and invite you'}
                    </p>
                  </div>
                </div>
              </SettingsCard>
            </section>

            <section className="space-y-4">
              <SettingsSectionLabel icon={Utensils} title="Cooking Preferences" />
              <SettingsCard style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#FFF8F2 100%)" }}>
                <div className="space-y-5">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div>
                      <Label>Default Servings</Label>
                      <p className="mb-2 text-xs text-stone-500">How many people are you usually cooking for?</p>
                      <Select value={defaultServings} onValueChange={setDefaultServings}>
                        <SelectTrigger className="h-11 w-full rounded-xl border-orange-200 bg-white/92 sm:w-56">
                          <Users className="mr-2 h-4 w-4" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVING_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label} · {option.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Skill Level</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {SKILL_OPTIONS.map((opt) => (
                          <Chip
                            key={opt}
                            label={opt}
                            selected={userProfile.skillLevel === opt}
                            onClick={() => setUserProfile({ skillLevel: opt })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Dietary Restrictions</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {DIETARY_OPTIONS.map((opt) => (
                        <Chip
                          key={opt}
                          label={opt}
                          selected={userProfile.dietaryRestrictions.includes(opt)}
                          onClick={() => toggleDietary(opt)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Flavor Preferences</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {FLAVOR_OPTIONS.map((opt) => (
                        <Chip
                          key={opt}
                          label={opt}
                          selected={userProfile.flavorProfiles.includes(opt)}
                          onClick={() => toggleFlavor(opt)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
                    <div className="flex items-center gap-2 text-stone-700">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold">Grocery Price Estimator</span>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                      <div>
                        <Label htmlFor="groceryLocation">Location</Label>
                        <p className="mb-2 text-xs text-stone-500">City or region used to estimate prices at nearby stores.</p>
                        <Input
                          id="groceryLocation"
                          value={userProfile.groceryLocation}
                          onChange={(e) => setUserProfile({ groceryLocation: e.target.value })}
                          placeholder="e.g. Austin, TX"
                          maxLength={80}
                          className="h-11 rounded-xl border-orange-200 bg-white"
                        />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Select value={userProfile.groceryCurrency || 'USD'} onValueChange={(value) => setUserProfile({ groceryCurrency: value })}>
                          <SelectTrigger className="mt-2 h-11 rounded-xl border-orange-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            </section>

            <section className="space-y-4">
              <SettingsSectionLabel icon={Camera} title="Dashboard Header" />
              <SettingsCard style={{ background: "linear-gradient(135deg,#FFFDFC 0%,#FFF4E7 100%)", borderColor: "rgba(249,115,22,0.14)" }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-xl">
                    <p className="text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Hero background image</p>
                    <p className="mt-1 text-sm text-stone-500">
                      Choose a specific image for your dashboard header, or let Munch reshuffle it once per day.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={dashboardHeroImageMode === 'manual' ? 'default' : 'outline'}
                      onClick={() => setHeroImagePickerOpen(true)}
                      className={dashboardHeroImageMode === 'manual' ? 'rounded-xl bg-orange-500 text-white hover:bg-orange-600' : 'rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50'}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Choose Image
                    </Button>
                    <Button
                      type="button"
                      variant={dashboardHeroImageMode === 'daily' ? 'default' : 'outline'}
                      onClick={() => setDashboardHeroImageMode('daily')}
                      className={dashboardHeroImageMode === 'daily' ? 'rounded-xl bg-orange-500 text-white hover:bg-orange-600' : 'rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50'}
                    >
                      <RotateCw className="mr-2 h-4 w-4" />
                      Shuffle Daily
                    </Button>
                  </div>
                </div>
                {heroImageOptions.length > 0 && (
                  <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-orange-100 bg-stone-100 shadow-inner">
                    <img
                      src={heroImageOptions[selectedHeroImageIndex]}
                      alt="Selected dashboard header"
                      className="aspect-[16/6] w-full object-cover"
                      onError={applyRecipeImageFallback}
                    />
                  </div>
                )}
              </SettingsCard>
            </section>

            <section className="space-y-4">
              <SettingsSectionLabel icon={ChefHat} title="Cook Mode Avatar" />
              <SettingsCard style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#FFF7EF 100%)" }}>
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-[1.6rem] bg-orange-100 blur-xl" />
                    <img src={chefAvatarUrl || '/placeholder.svg'} alt="Chef avatar" className="relative h-24 w-24 rounded-[1.6rem] border-2 border-white bg-orange-50 object-cover shadow-lg" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Your chef identity</p>
                    <p className="mt-1 text-sm text-stone-500">Update the avatar that follows you around cook mode and the rest of your kitchen.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50">
                        <Camera className="mr-2 h-4 w-4" /> {uploadingAvatar ? 'Uploading...' : 'Custom Photo'}
                      </Button>
                      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      <Button
                        variant="secondary"
                        onClick={() => setAvatarDialogOpen(true)}
                        className="rounded-xl border border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100"
                      >
                        <ChefHat className="mr-2 h-4 w-4" /> Redesign Avatar
                      </Button>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            </section>

            <section className="space-y-4">
              <SettingsSectionLabel icon={Crown} title="Testing" />
              <SettingsCard style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#FFF9F4 100%)" }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Enable premium features on this device</p>
                      <p className="text-xs text-muted-foreground">Developer toggle for testing premium-only experiences.</p>
                    </div>
                    <Switch
                      checked={premiumOverrideEnabled}
                      onCheckedChange={(checked) => {
                        setPremiumOverrideEnabled(checked);
                        setPremiumOverride(checked);
                        toast({ title: checked ? 'Premium enabled for testing' : 'Premium testing disabled' });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Disable AI agent API calls</p>
                      <p className="text-xs text-muted-foreground">Keeps local logic plus recipe feeds like TheMealDB and Spoonacular available for testing.</p>
                    </div>
                    <Switch
                      checked={aiAgentCallsDisabled}
                      onCheckedChange={(checked) => {
                        setAiAgentCallsDisabled(checked);
                        toast({ title: checked ? 'AI agent calls disabled for testing' : 'AI agent calls re-enabled' });
                      }}
                    />
                  </div>
                </div>
              </SettingsCard>
            </section>

            <section className="space-y-4">
              <SettingsSectionLabel icon={User} title="Recipe Sharing" />
              <SettingsCard style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#FFF8F1 100%)" }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Share custom recipes by default</p>
                    <p className="text-xs text-muted-foreground">New manual recipes will start as discoverable to others.</p>
                  </div>
                  <Switch checked={shareCustomRecipesByDefault} onCheckedChange={setShareCustomRecipesByDefault} />
                </div>
              </SettingsCard>
            </section>

            <RecipeScraperTester />
          </div>

          <div className="space-y-6 xl:sticky xl:top-6">
            <section className="space-y-4">
              <SettingsSectionLabel icon={Crown} title="Current Plan" />
              <SettingsCard
                style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 55%,#F5F3FF 100%)", borderColor: "rgba(249,115,22,0.12)" }}
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                      {isPremiumPlan ? 'Premium active' : 'Free plan'}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      {isPremiumPlan ? 'Munch Member' : 'Munch Free'}
                    </p>
                    <p className="mt-2 text-sm text-stone-500">
                      {isPremiumPlan
                        ? 'You have access to premium AI tools, imports, Kitchens, and meal planning.'
                        : 'Upgrade to unlock meal planning, Kitchens, AI imports, nutritional facts, and premium cooking tools.'}
                    </p>
                    {isPremiumPlan && (
                      <p className="mt-2 text-xs text-stone-400">
                        {formattedPremiumDate ? `Renews or ends on ${formattedPremiumDate}` : 'Premium membership is active on this account.'}
                      </p>
                    )}
                  </div>
                  {!isPremiumPlan && (
                    <Button
                      type="button"
                      onClick={() => openPremiumPage('Munch Membership')}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100/95 text-orange-500">
                        <Crown className="h-3.5 w-3.5" />
                      </span>
                      Upgrade
                    </Button>
                  )}
                </div>
              </SettingsCard>
            </section>

            <SettingsCard className="space-y-4" style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#FFF5EA 100%)" }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Save</p>
                <p className="mt-1 text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Keep your kitchen up to date</p>
                <p className="mt-1 text-sm text-stone-500">Save profile, preference, and branding changes in one go.</p>
              </div>
              <Button onClick={handleSave} disabled={loading} className="w-full rounded-2xl bg-orange-500 text-white hover:bg-orange-600">
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </SettingsCard>

            <SettingsCard className="space-y-3" style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#FFF7F3 100%)", borderColor: "rgba(239,68,68,0.12)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Danger zone</p>
              <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => setShowSignOutConfirm(true)}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl"
                onClick={() => {
                  setUserProfile({ dietaryRestrictions: [], skillLevel: '', flavorProfiles: [], groceryLocation: '', groceryCurrency: 'USD' });
                  useStore.setState({ onboardingComplete: false });
                  toast({ title: 'Preferences reset!' });
                  navigate('/onboarding');
                }}
              >
                <Flame className="mr-2 h-4 w-4" /> Redo Onboarding
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl"
                onClick={() => setShowResetTutorialConfirm(true)}
              >
                <Compass className="mr-2 h-4 w-4" /> Reset Tutorial
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowClearDataConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Clear Local Data
              </Button>
            </SettingsCard>
          </div>
        </div>
      </div>

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader>
            <DialogTitle className="px-4 pt-4 sm:px-6 sm:pt-6">Customize your avatar</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(94vh-64px)] overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
            <AvatarStudio
              config={avatarConfig}
              onChange={(updates) => setAvatarConfig((current) => createMunchAvatarConfig({ ...current, ...updates }))}
              action={
                <button
                  onClick={handleSaveAvatarDesign}
                  className="w-full rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                >
                  Save this avatar
                </button>
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={heroImagePickerOpen} onOpenChange={setHeroImagePickerOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader>
            <DialogTitle className="px-4 pt-4 sm:px-6 sm:pt-6">Choose dashboard image</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-64px)] overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {heroImageOptions.map((src, index) => {
                const isSelected = dashboardHeroImageMode === 'manual' && selectedHeroImageIndex === index;
                return (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => {
                      setDashboardHeroImageMode('manual');
                      setDashboardHeroImageSeed(index);
                      setHeroImagePickerOpen(false);
                    }}
                    className={`overflow-hidden rounded-2xl border text-left transition-all ${
                      isSelected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-stone-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-stone-100">
                      <img
                        src={src}
                        alt={`Dashboard option ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={applyRecipeImageFallback}
                      />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-semibold text-stone-800">Image {index + 1}</span>
                      {isSelected && <span className="text-xs font-bold uppercase tracking-wide text-orange-500">Selected</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUsernameChangeConfirm} onOpenChange={setShowUsernameChangeConfirm}>
        <DialogContent className="max-w-sm p-6 rounded-2xl">
          <div className="flex flex-col gap-4">
            <DialogTitle className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Change username?
            </DialogTitle>
            <p className="text-sm text-stone-500">
              Your recipes will stay attached to the same chef profile and backend account, but you’ll give up your current username and need to save a new available one.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowUsernameChangeConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-xl bg-orange-500 text-white hover:bg-orange-600"
                onClick={() => {
                  setUsernameEditUnlocked(true);
                  setShowUsernameChangeConfirm(false);
                }}
              >
                Edit Username
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <DialogContent className="max-w-xs p-6 rounded-2xl">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-2">
              <LogOut size={24} />
            </div>
            <DialogTitle className="text-xl font-bold font-display">Sign Out</DialogTitle>
            <p className="text-sm text-stone-500 pb-2">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex w-full gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowSignOutConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetTutorialConfirm} onOpenChange={setShowResetTutorialConfirm}>
        <DialogContent className="max-w-xs p-6 rounded-2xl">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-2">
              <Compass size={24} />
            </div>
            <DialogTitle className="text-xl font-bold font-display">Reset Tutorial</DialogTitle>
            <p className="text-sm text-stone-500 pb-2">
              Would you like to restart the guided tour from the beginning?
            </p>
            <div className="flex w-full gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowResetTutorialConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => {
                  resetTutorial();
                  setShowResetTutorialConfirm(false);
                  toast({ title: 'Tutorial reset!' });
                  window.scrollTo(0, 0);
                  navigate('/dashboard');
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDataConfirm} onOpenChange={setShowClearDataConfirm}>
        <DialogContent className="max-w-xs p-6 rounded-2xl">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
              <Trash2 size={24} />
            </div>
            <DialogTitle className="text-xl font-bold font-display text-red-600">Clear Local Data</DialogTitle>
            <p className="text-sm text-stone-500 pb-2">
              This will wipe all local recipes, pantry items, and preferences from this device. <span className="font-bold">This cannot be undone.</span>
            </p>
            <div className="flex w-full gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowClearDataConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  resetStore();
                  setShowClearDataConfirm(false);
                  toast({ title: 'Local data cleared' });
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
