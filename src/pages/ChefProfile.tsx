import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/data/recipes';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChefHat, Clock, Grid3X3, List, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { normalizeRecipe } from '@/lib/normalizeRecipe';
import { applyRecipeImageFallback, getRecipeImageSrc } from '@/lib/recipeImage';
import RecipePreviewDialog from '@/components/RecipePreviewDialog';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import munchLogo from '@/assets/munch-logo.png';
import { MUNCH_CHEF_NAME, MUNCH_OFFICIAL_USER_ID } from '@/lib/munchIdentity';
import { Input } from '@/components/ui/input';
import { getRecipeChefName, getResolvedRecipeSourceUrl, isMunchAuthoredRecipe, isMunchChefLabel, shouldShowChefAttribution } from '@/lib/recipeAttribution';

export default function ChefProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { likeRecipe, likedRecipes } = useStore();
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const isKnownMunchChef = userId === MUNCH_OFFICIAL_USER_ID;

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
        .order('created_at', { ascending: false });
      if (error) throw error;
      const normalized = (data || []).map((r: any) => normalizeRecipe(r));
      return normalized.filter((recipe) => {
        const recipeChefName = getRecipeChefName(recipe);
        const isMunch = !recipeChefName || isMunchChefLabel(recipeChefName);

        if (isKnownMunchChef) {
          // Strictly only show recipes that are munch-authored OR recipes that were curated/imported by Munch and strictly labelled as Munch
          return isMunchAuthoredRecipe(recipe) || (
            recipe.created_by === MUNCH_OFFICIAL_USER_ID &&
            isMunch &&
            !getResolvedRecipeSourceUrl(recipe)
          );
        }

        // For other chefs, match the display name or created_by
        const matchesName = recipeChefName && profile?.display_name && (
          recipeChefName.toLowerCase() === profile.display_name.toLowerCase()
        );
        return matchesName || recipe.created_by === userId;
      });
    },
    enabled: !!userId,
  });

  const isMunchChef = (profile?.display_name || '').trim().toLowerCase() === MUNCH_CHEF_NAME || userId === MUNCH_OFFICIAL_USER_ID;
  const displayName = profile?.display_name || (isMunchChef ? MUNCH_CHEF_NAME : 'Chef');
  const recipeCountLabel = `${recipes.length} public recipe${recipes.length !== 1 ? 's' : ''}`;
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
    <div
      className="min-h-full"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        background: "#FFFAF5",
      }}
    >
      <div className="relative overflow-hidden border-b border-orange-100/80 bg-gradient-to-br from-orange-50 via-[#FFFAF5] to-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, rgba(251,146,60,0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(251,191,36,0.1), transparent 30%)",
          }}
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">
              Chef
            </p>
            <h1
              className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] text-stone-900 sm:text-[34px]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Chef Profile
            </h1>
            <p className="mt-2 max-w-2xl text-xs text-stone-500 sm:text-sm">
              Explore recipes published by {displayName}.
              {' '}
              {recipeCountLabel}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-10 shrink-0 rounded-full border-orange-200 bg-white/90 px-4 text-sm font-semibold text-stone-700 shadow-sm hover:border-orange-300 hover:bg-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-6 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-4 rounded-[28px] border border-orange-100 bg-white/95 p-5 shadow-[0_18px_50px_-32px_rgba(120,53,15,0.28)]"
        >
          {isMunchChef ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-200 bg-white p-2 shadow-sm">
              <img src={munchLogo} alt="munch" className="h-full w-full object-contain" />
            </div>
          ) : profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-16 w-16 rounded-full border-2 border-orange-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-200 bg-orange-50">
              <ChefHat className="h-8 w-8 text-orange-500" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">
              Profile
            </p>
            <h2
              className="mt-1 truncate text-2xl font-semibold text-stone-900"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {displayName}
            </h2>
            {(profile as any)?.username && (
              <p className="mt-1 text-xs text-stone-500">@{(profile as any).username}</p>
            )}
            <p className="mt-2 text-sm text-stone-500">{recipeCountLabel}</p>
          </div>
        </motion.div>

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
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">
              {displayName}'s Recipes
            </h3>
            <p className="text-xs text-stone-500">Browse the published collection</p>
          </div>
          <button
            type="button"
            onClick={() => setView((current) => current === 'grid' ? 'list' : 'grid')}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-500"
            aria-label="Toggle chef recipe layout"
          >
            {view === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${displayName}'s recipes`}
            className="h-11 rounded-2xl border-orange-100 bg-white pl-10 text-stone-700 placeholder:text-stone-400"
          />
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-stone-500">Loading recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="py-16 text-center text-stone-500">No public recipes yet.</div>
        ) : filteredRecipes.length === 0 ? (
          <div className="py-16 text-center text-stone-500">No recipes match that search yet.</div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4' : 'space-y-1'}>
            {filteredRecipes.map((recipe, i) => (
              view === 'grid' ? (
                <motion.button
                  key={recipe.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setPreviewRecipe(recipe)}
                  className="overflow-hidden rounded-[24px] border border-orange-100 bg-white text-left shadow-[0_12px_32px_-28px_rgba(120,53,15,0.3)] transition-colors hover:border-orange-200"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={getRecipeImageSrc(recipe.image)}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={applyRecipeImageFallback}
                    />
                  </div>
                  <div className="p-2.5">
                    <h4
                      className="truncate text-sm font-semibold text-stone-900"
                      style={{ fontFamily: "'Fraunces', serif" }}
                    >
                      {recipe.name}
                    </h4>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {recipe.cook_time} · {recipe.difficulty}
                    </p>
                  </div>
                </motion.button>
              ) : (
                <motion.button
                  key={recipe.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setPreviewRecipe(recipe)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-transparent bg-white/70 p-4 text-left transition-colors hover:border-orange-100 hover:bg-white"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    <img
                      src={getRecipeImageSrc(recipe.image)}
                      alt={recipe.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={applyRecipeImageFallback}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4
                      className="truncate text-sm font-semibold text-stone-900"
                      style={{ fontFamily: "'Fraunces', serif" }}
                    >
                      {recipe.name}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-orange-500" />
                        {recipe.cook_time}
                      </span>
                      {recipe.difficulty && <span>{recipe.difficulty}</span>}
                      {recipe.cuisine && <span>{recipe.cuisine}</span>}
                    </div>
                  </div>
                </motion.button>
              )
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
        chefName={previewRecipe ? (getRecipeChefName(previewRecipe) || (isMunchChef ? MUNCH_CHEF_NAME : displayName)) : null}
        chefId={previewRecipe ? (isMunchChef ? MUNCH_OFFICIAL_USER_ID : (userId || previewRecipe.created_by || null)) : null}
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
