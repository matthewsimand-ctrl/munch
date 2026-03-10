import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, LogOut, User, Users, Utensils, Trash2, Flame, FolderArchive, Camera, ChefHat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'None'];
const SKILL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const NO_PREFERENCE_OPTION = 'No preference';
const FLAVOR_OPTIONS = ['Spicy', 'Sweet', 'Savory', 'Umami', 'Fresh/Citrusy', NO_PREFERENCE_OPTION];

const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
      selected
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
  const {
    userProfile,
    setUserProfile,
    resetStore,
    chefAvatarUrl,
    setChefAvatarUrl,
    setShowTutorial,
    shareCustomRecipesByDefault,
    setShareCustomRecipesByDefault,
  } = useStore();
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [defaultServings, setDefaultServings] = useState('2');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth', { replace: true });
        return;
      }
      setUser(session.user);
      supabase
        .from('profiles')
        .select('display_name, default_servings')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name || '');
            setDefaultServings(String((data as any).default_servings || 2));
          }
        });
    });
  }, [navigate]);

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
    
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        display_name: displayName.trim() || null,
        default_servings: parseInt(defaultServings) || 2,
      } as any, { onConflict: 'user_id' });

    setLoading(false);
    if (error) {
      console.error('Profile save error:', error);
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved! ✓' });
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to sign out?');
    if (!confirmed) return;

    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        </div>

        <div className="space-y-8">
          {/* Profile */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Profile</span>
            </div>
            <div className="space-y-3 bg-card rounded-xl p-4 border border-border">
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
            </div>
          </section>

          {/* Cooking Preferences */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Utensils className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Cooking Preferences</span>
            </div>
            <div className="space-y-4 bg-card rounded-xl p-4 border border-border">
              <div>
                <Label>Default Servings</Label>
                <p className="text-xs text-muted-foreground mb-2">How many people are you usually cooking for?</p>
                <Select value={defaultServings} onValueChange={setDefaultServings}>
                  <SelectTrigger className="w-32">
                    <Users className="h-4 w-4 mr-2" />
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

              {/* Archive Behavior */}
              <div>
                <Label>After Cooking</Label>
                <p className="text-xs text-muted-foreground mb-2">What to do with a recipe after you finish cooking it</p>
                <Select value={useStore.getState().archiveBehavior} onValueChange={(v) => useStore.getState().setArchiveBehavior(v as any)}>
                  <SelectTrigger className="w-56">
                    <FolderArchive className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ask">Ask me every time</SelectItem>
                    <SelectItem value="always">Always archive</SelectItem>
                    <SelectItem value="never">Never archive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ChefHat className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Cook Mode Avatar</span>
            </div>
            <div className="space-y-3 bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <img src={chefAvatarUrl || '/placeholder.svg'} alt="Chef avatar" className="h-14 w-14 rounded-full object-cover border border-border" />
                <div className="space-y-1">
                  <p className="text-sm text-foreground">Customize your in-game cook companion.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
                    <Camera className="h-4 w-4 mr-1.5" /> {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                  </Button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Recipe Sharing</span>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Share custom recipes by default</p>
                <p className="text-xs text-muted-foreground">New manual recipes will start as discoverable to others.</p>
              </div>
              <Switch checked={shareCustomRecipesByDefault} onCheckedChange={setShareCustomRecipesByDefault} />
            </div>
          </section>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>

          {/* Danger Zone */}
          <section className="space-y-3">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowTutorial(true);
                navigate('/dashboard');
              }}
            >
              <ChefHat className="h-4 w-4 mr-2" /> Replay Spotlight Tutorial
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setUserProfile({ dietaryRestrictions: [], skillLevel: '', flavorProfiles: [] });
                useStore.setState({ onboardingComplete: false });
                toast({ title: 'Preferences reset!' });
                navigate('/onboarding');
              }}
            >
              <Flame className="h-4 w-4 mr-2" /> Redo Onboarding
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                const confirmed = window.confirm('Clear all local data on this device? This cannot be undone.');
                if (!confirmed) return;

                resetStore();
                toast({ title: 'Local data cleared' });
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Clear Local Data
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
