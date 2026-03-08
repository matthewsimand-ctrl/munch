import { useState, useMemo, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { useBrowseFeed } from '@/hooks/useBrowseFeed';
import { calculateMatch } from '@/lib/matchLogic';
import { rankByRecommendation } from '@/lib/recommendations';
import { filterByMealType, getTimeBasedCategory, MEAL_CATEGORIES, type MealCategory } from '@/lib/mealTimeUtils';
import SwipeCard from '@/components/SwipeCard';
import RecipePreviewDialog from '@/components/RecipePreviewDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, X, UtensilsCrossed, User, Search, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import type { Recipe } from '@/data/recipes';

export default function Swipe() {
  const navigate = useNavigate();
  const { pantryList, likeRecipe, likedRecipes, savedApiRecipes } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [filterText, setFilterText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mealFilter, setMealFilter] = useState<MealCategory>('all');
  const suggestedCategory = useMemo(() => getTimeBasedCategory(), []);
  const { data: dbRecipes = [], isLoading: dbLoading } = useDbRecipes();
  const { recipes: browseRecipes, loading: browseLoading, loaded: browseLoaded, loadFeed } = useBrowseFeed();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const pantryNames = useMemo(() => pantryList.map(p => p.name), [pantryList]);

  const likedRecipeObjects = useMemo(() => {
    return likedRecipes
      .map(id => dbRecipes.find(r => r.id === id) || savedApiRecipes[id])
      .filter(Boolean) as Recipe[];
  }, [likedRecipes, dbRecipes, savedApiRecipes]);

  const likedIdSet = useMemo(() => new Set(likedRecipes), [likedRecipes]);

  // Text filter function — matches name, cuisine, ingredients, tags
  const matchesFilter = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return () => true;
    const terms = q.split(/\s+/);
    return (r: Recipe) => {
      const haystack = [
        r.name,
        r.cuisine || '',
        ...(r.tags || []),
        ...(r.ingredients || []),
      ].join(' ').toLowerCase();
      return terms.every(t => haystack.includes(t));
    };
  }, [filterText]);

  // Combine all recipe sources
  const allRecipes = useMemo(() => {
    const seen = new Set<string>();
    const merged: Recipe[] = [];
    for (const r of [...dbRecipes, ...browseRecipes]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }
    // Apply meal type filter then text filter
    return filterByMealType(merged, mealFilter).filter(matchesFilter);
  }, [dbRecipes, browseRecipes, mealFilter, matchesFilter]);

  // Rank recipes
  const rankedRecipes = useMemo(() => {
    const recommended = rankByRecommendation(allRecipes, likedRecipeObjects, likedIdSet);
    return recommended.map(({ recipe, recScore }) => {
      const match = calculateMatch(pantryNames, recipe.ingredients);
      const combinedScore = match.percentage * 0.4 + recScore * 0.6;
      return { recipe, match, recScore, combinedScore, source: (recipe as any).source };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
  }, [pantryNames, allRecipes, likedRecipeObjects, likedIdSet]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [allRecipes.length]);

  const handleSwipe = (dir: 'left' | 'right') => {
    const r = rankedRecipes[currentIndex];
    if (dir === 'right') {
      likeRecipe(r.recipe.id, r.recipe);
    }
    setCurrentIndex(prev => prev + 1);
  };

  const current = rankedRecipes[currentIndex];
  const next = rankedRecipes[currentIndex + 1];
  const isLoading = (dbLoading && !browseLoaded) || (browseLoading && dbRecipes.length === 0);
  const totalAvailable = rankedRecipes.length;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 max-w-md mx-auto w-full flex items-center justify-between">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">Munch</span>
        </button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <User className="h-5 w-5" />
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="px-6 pb-3 max-w-md mx-auto w-full" data-tutorial="swipe-search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by cuisine, ingredient, or dish name..."
            value={filterText}
            onChange={(e) => { setFilterText(e.target.value); setCurrentIndex(0); }}
            className="pl-9"
          />
          {filterText && (
            <button
              onClick={() => { setFilterText(''); setCurrentIndex(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={mealFilter} onValueChange={(v) => { setMealFilter(v as MealCategory); setCurrentIndex(0); }}>
              <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}{c.value === suggestedCategory ? ' ✦' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {browseLoading ? 'Loading...' : `${totalAvailable} recipes`}
          </Badge>
          {filterText && (
            <Badge variant="secondary" className="text-xs">
              Filtered
            </Badge>
          )}
          {currentIndex > 0 && totalAvailable > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {currentIndex}/{totalAvailable}
            </span>
          )}
        </div>
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center px-6" data-tutorial="swipe-card-area">
        <div className="relative w-full max-w-md h-[440px]">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading hundreds of recipes...</p>
            </div>
          ) : current ? (
            <AnimatePresence>
              {next && (
                <SwipeCard
                  key={next.recipe.id}
                  recipe={next.recipe}
                  match={next.match}
                  onSwipe={() => {}}
                  isTop={false}
                />
              )}
              <SwipeCard
                key={current.recipe.id}
                recipe={current.recipe}
                match={current.match}
                onSwipe={handleSwipe}
                onImageTap={() => setPreviewOpen(true)}
                isTop={true}
              />
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <UtensilsCrossed className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                {filterText ? 'No matches found' : "You've browsed them all!"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {filterText
                  ? 'Try a different filter or clear your search.'
                  : 'Try a different filter or check your saved recipes.'}
              </p>
              <div className="flex gap-3">
                {filterText ? (
                  <Button onClick={() => { setFilterText(''); setCurrentIndex(0); }}>
                    Clear Filter
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate('/pantry')}>
                      Update Pantry
                    </Button>
                    <Button onClick={() => navigate('/saved')}>
                      View Saved ({likedRecipes.length})
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {current && !isLoading && (
        <div className="p-6 max-w-md mx-auto w-full flex justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleSwipe('left')}
          >
            <X className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-success text-success-foreground hover:bg-success/90 border-2 border-success"
            onClick={() => handleSwipe('right')}
          >
            <Heart className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Recipe Preview Dialog */}
      {current && (
        <RecipePreviewDialog
          recipe={current.recipe}
          match={current.match}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}

      <BottomNav />
    </div>
  );
}
