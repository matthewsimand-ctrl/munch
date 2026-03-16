import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/data/recipes';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChefHat, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { normalizeRecipe } from '@/lib/normalizeRecipe';
import { applyRecipeImageFallback } from '@/lib/recipeImage';
import RecipePreviewDialog from '@/components/RecipePreviewDialog';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import munchLogo from '@/assets/munch-logo.png';
import { MUNCH_CHEF_NAME, MUNCH_OFFICIAL_USER_ID } from '@/lib/munchIdentity';
import { Input } from '@/components/ui/input';

export default function ChefProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { likeRecipe, likedRecipes } = useStore();
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [search, setSearch] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['chef-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, username')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['chef-recipes', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('created_by', userId!)
        .eq('is_public', true)
        .not('chef', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => normalizeRecipe(r));
    },
    enabled: !!userId,
  });

  const isMunchChef = (profile?.display_name || '').trim().toLowerCase() === MUNCH_CHEF_NAME || userId === MUNCH_OFFICIAL_USER_ID;
  const displayName = profile?.display_name || (isMunchChef ? MUNCH_CHEF_NAME : 'Chef');
  const likedSet = useMemo(() => new Set(likedRecipes), [likedRecipes]);
  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recipes;

    return recipes.filter((recipe) => {
      const haystack = [
        recipe.name,
        recipe.cuisine,
        recipe.chef,
        recipe.cook_time,
        ...(recipe.tags || []),
        ...(recipe.ingredients || []),
        ...(recipe.instructions || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [recipes, search]);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-8 pb-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground">Chef Profile</h1>
        </div>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8 p-5 rounded-2xl bg-card border border-border"
        >
          {isMunchChef ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-white p-2">
              <img src={munchLogo} alt="munch" className="h-full w-full object-contain" />
            </div>
          ) : profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
              <ChefHat className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{displayName}</h2>
            {(profile as any)?.username && (
              <p className="text-xs text-muted-foreground mt-1">@{(profile as any).username}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {recipes.length} public recipe{recipes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </motion.div>

        {/* Recipes grid */}
        <div className="mb-4 flex items-center gap-3">
          {isMunchChef ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white p-1.5">
              <img src={munchLogo} alt="munch" className="h-full w-full object-contain" />
            </div>
          ) : profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover border border-orange-200"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-orange-50">
              <ChefHat className="h-5 w-5 text-orange-500" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {displayName}'s Recipes
            </h3>
            <p className="text-xs text-muted-foreground">{displayName}</p>
          </div>
        </div>

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${displayName}'s recipes`}
            className="h-11 rounded-2xl border-orange-100 bg-white pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No public recipes yet.</div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No recipes match that search yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filteredRecipes.map((recipe, i) => (
              <motion.button
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setPreviewRecipe(recipe)}
                className="rounded-xl overflow-hidden bg-card border border-border text-left hover:border-primary/30 transition-colors"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={applyRecipeImageFallback}
                  />
                </div>
                <div className="p-2.5">
                  <h4 className="font-display font-bold text-sm text-foreground truncate">
                    {recipe.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {recipe.cook_time} · {recipe.difficulty}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
      <RecipePreviewDialog
        recipe={previewRecipe}
        match={null}
        open={!!previewRecipe}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPreviewRecipe(null);
        }}
        chefName={displayName}
        chefId={userId || null}
        mode="explore"
        isSaved={previewRecipe ? likedSet.has(previewRecipe.id) : false}
        onSave={(recipe) => {
          likeRecipe(recipe.id, recipe);
          toast.success(likedSet.has(recipe.id) ? `${recipe.name} is already in your recipes` : `Saved ${recipe.name}`);
          setPreviewRecipe(null);
        }}
      />
    </div>
  );
}
