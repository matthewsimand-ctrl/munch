import { useState, useMemo } from 'react';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { calculateMatch } from '@/lib/matchLogic';
import SwipeCard from '@/components/SwipeCard';
import RecipePreviewDialog from '@/components/RecipePreviewDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, X, UtensilsCrossed, User, Search, Loader2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useRecipeSearch } from '@/hooks/useRecipeSearch';
import { Badge } from '@/components/ui/badge';

export default function Swipe() {
  const navigate = useNavigate();
  const { pantryList, likeRecipe, likedRecipes } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const { apiRecipes, loading: searchLoading, searched, search } = useRecipeSearch();
  const { data: dbRecipes = [], isLoading: dbLoading } = useDbRecipes();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const pantryNames = useMemo(() => pantryList.map(p => p.name), [pantryList]);

  const allRecipes = useMemo(() => {
    if (apiRecipes.length > 0) return apiRecipes;
    return dbRecipes;
  }, [apiRecipes, dbRecipes]);

  const rankedRecipes = useMemo(() => {
    return allRecipes
      .map((r) => ({ recipe: r, match: calculateMatch(pantryNames, r.ingredients), source: (r as any).source }))
      .sort((a, b) => b.match.percentage - a.match.percentage);
  }, [pantryNames, allRecipes]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [allRecipes]);

  const handleSwipe = (dir: 'left' | 'right') => {
    const r = rankedRecipes[currentIndex];
    if (dir === 'right') {
      likeRecipe(r.recipe.id, r.recipe);
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentIndex(0);
      search(searchQuery.trim());
    }
  };

  const current = rankedRecipes[currentIndex];
  const next = rankedRecipes[currentIndex + 1];

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

      {/* Search Bar */}
      <div className="px-6 pb-3 max-w-md mx-auto w-full">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes online..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={searchLoading || !searchQuery.trim()}>
            {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          </Button>
        </form>
        {searched && apiRecipes.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {apiRecipes.length} results from APIs
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => { setCurrentIndex(0); search(searchQuery); }}
            >
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-full max-w-md h-[440px]">
          {(searchLoading || dbLoading) ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Searching recipes...</p>
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
                {searched ? 'No more results!' : "That's all for now!"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {searched ? 'Try a different search or check your saved recipes.' : "You've seen all recipes. Search online or check your saved ones."}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/pantry')}>
                  Update Pantry
                </Button>
                <Button onClick={() => navigate('/saved')}>
                  View Saved ({likedRecipes.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {current && !(searchLoading || dbLoading) && (
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
