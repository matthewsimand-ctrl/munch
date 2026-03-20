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
    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selected
      ? 'bg-primary text-primary-foreground border-primary'
      : 'bg-card text-foreground border-border hover:border-primary/50'
      }`}
  >
    {label}
  </button>
);

export default function Settings() {
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
    <div className="min-h-screen pb-20" style={{ background: "#FFFAF5" }}>
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
        <div
          className="mb-6 rounded-[1.9rem] border px-4 py-5 sm:px-6"
          style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 48%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)", boxShadow: "0 12px 30px rgba(28,25,23,0.06)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Your account</p>
              <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Settings</h1>
              <p className="mt-1 text-sm text-stone-500">Manage your profile, dashboard look, cooking defaults, and chef identity.</p>
            </div>
          </div>
            <div className="hidden rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 text-right shadow-sm md:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">Current chef</p>
              <p className="mt-1 text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {displayName || 'Chef'}
              </p>
              <p className="text-xs text-stone-500">{originalUsername ? `@${originalUsername}` : 'Pick a username below'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Profile</span>
              </div>
              <div className="space-y-4 rounded-[1.75rem] border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 8px 24px rgba(28,25,23,0.05)" }}>
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{user?.email || '—'}</p>
              </div>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                />
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
                      className="h-8 rounded-full px-3 text-xs"
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
                  className={Boolean(originalUsername) && !usernameEditUnlocked ? 'bg-stone-50 text-stone-500' : ''}
                />
                <p className={`mt-1 text-xs ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {originalUsername && !usernameEditUnlocked && 'Your username is locked until you choose to edit it.'}
                  {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'checking' && 'Checking username...'}
                  {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'available' && `@${normalizeUsername(username)} is available`}
                  {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'taken' && 'That username is already taken'}
                  {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'invalid' && 'Use 3-24 lowercase letters, numbers, or underscores'}
                  {(!originalUsername || usernameEditUnlocked) && usernameStatus === 'idle' && 'People can use this to find and invite you'}
                </p>
              </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Crown className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Current Plan</span>
              </div>
              <div
                className="rounded-[1.75rem] border p-5"
                style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 55%,#F5F3FF 100%)", borderColor: "rgba(249,115,22,0.12)", boxShadow: "0 8px 24px rgba(28,25,23,0.05)" }}
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                      {isPremiumPlan ? 'Premium active' : 'Free plan'}
                    </p>
                    <p className="mt-1 text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      {isPremiumPlan ? 'Munch Member' : 'Munch Free'}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {isPremiumPlan
                        ? 'You have access to premium AI tools, imports, Kitchens, and meal planning.'
                        : 'Upgrade to unlock meal planning, Kitchens, AI imports, nutritional facts, and premium cooking tools.'}
                    </p>
                    {isPremiumPlan && (
                      <p className="mt-1 text-xs text-stone-400">
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
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Dashboard Header</span>
                </div>
                <div className="rounded-[1.75rem] border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 8px 24px rgba(28,25,23,0.05)" }}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">Hero background image</p>
                      <p className="mt-1 text-sm text-stone-500">
                        Choose a specific image for your dashboard header, or let Munch reshuffle it once per day.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={dashboardHeroImageMode === 'manual' ? 'default' : 'outline'}
                        onClick={() => setHeroImagePickerOpen(true)}
                        className={dashboardHeroImageMode === 'manual' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Choose Image
                      </Button>
                      <Button
                        type="button"
                        variant={dashboardHeroImageMode === 'daily' ? 'default' : 'outline'}
                        onClick={() => setDashboardHeroImageMode('daily')}
                        className={dashboardHeroImageMode === 'daily' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                      >
                        <RotateCw className="mr-2 h-4 w-4" />
                        Shuffle Daily
                      </Button>
                    </div>
                  </div>
                  {heroImageOptions.length > 0 && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-stone-100">
                      <img
                        src={heroImageOptions[selectedHeroImageIndex]}
                        alt="Selected dashboard header"
                        className="aspect-[16/6] w-full object-cover"
                        onError={applyRecipeImageFallback}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <RecipeScraperTester />

          {/* Cooking Preferences */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Utensils className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Cooking Preferences</span>
            </div>
            <div className="space-y-4 rounded-2xl border p-4" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
              <div>
                <Label>Default Servings</Label>
                <p className="text-xs text-muted-foreground mb-2">How many people are you usually cooking for?</p>
                <Select value={defaultServings} onValueChange={setDefaultServings}>
                  <SelectTrigger className="w-32">
                    <Users className="h-4 w-4 mr-2" />
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
                <div className="flex flex-wrap gap-2 mt-2">
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

              <div>
                <Label>Dietary Restrictions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
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
                <div className="flex flex-wrap gap-2 mt-2">
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


              <div className="pt-2 border-t border-border/70 space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-semibold">Grocery Price Estimator</span>
                </div>
                <div>
                  <Label htmlFor="groceryLocation">Location</Label>
                  <p className="text-xs text-muted-foreground mb-2">City or region used to estimate prices at nearby stores.</p>
                  <Input
                    id="groceryLocation"
                    value={userProfile.groceryLocation}
                    onChange={(e) => setUserProfile({ groceryLocation: e.target.value })}
                    placeholder="e.g. Austin, TX"
                    maxLength={80}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={userProfile.groceryCurrency || 'USD'} onValueChange={(value) => setUserProfile({ groceryCurrency: value })}>
                    <SelectTrigger className="w-32">
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
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ChefHat className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Cook Mode Avatar</span>
            </div>
            <div className="space-y-6 rounded-2xl border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
                  <img src={chefAvatarUrl || '/placeholder.svg'} alt="Chef avatar" className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-lg relative z-10 bg-orange-50" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">Your Chef Identity</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="h-8 text-xs">
                      <Camera className="h-3 w-3 mr-1.5" /> {uploadingAvatar ? 'Uploading...' : 'Custom Photo'}
                    </Button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAvatarDialogOpen(true)}
                      className="h-8 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-100"
                    >
                      <ChefHat className="h-3 w-3 mr-1.5" /> Redesign Avatar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>


          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Testing</span>
            </div>
            <div className="space-y-4 rounded-2xl border p-4" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
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

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/70">
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
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Recipe Sharing</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border p-4" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
              <div>
                <p className="text-sm font-medium text-foreground">Share custom recipes by default</p>
                <p className="text-xs text-muted-foreground">New manual recipes will start as discoverable to others.</p>
              </div>
              <Switch checked={shareCustomRecipesByDefault} onCheckedChange={setShareCustomRecipesByDefault} />
            </div>
          </section>

          <Button onClick={handleSave} disabled={loading} className="w-full rounded-2xl bg-orange-500 text-white hover:bg-orange-600">
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>

          {/* Danger Zone */}
          <section className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => setShowSignOutConfirm(true)}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setUserProfile({ dietaryRestrictions: [], skillLevel: '', flavorProfiles: [], groceryLocation: '', groceryCurrency: 'USD' });
                useStore.setState({ onboardingComplete: false });
                toast({ title: 'Preferences reset!' });
                navigate('/onboarding');
              }}
            >
              <Flame className="h-4 w-4 mr-2" /> Redo Onboarding
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowResetTutorialConfirm(true)}
            >
              <Compass className="h-4 w-4 mr-2" /> Reset Tutorial
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowClearDataConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Clear Local Data
            </Button>
          </section>
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
