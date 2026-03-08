import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { recipes } from '@/data/recipes';
import { calculateMatch } from '@/lib/matchLogic';
import SwipeCard from '@/components/SwipeCard';
import { Button } from '@/components/ui/button';
import { Heart, X, BookOpen, ChefHat, UtensilsCrossed, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState as useStateAlias, useEffect as useEffectAlias } from 'react';

export default function Swipe() {
  const navigate = useNavigate();
  const { pantryList, likeRecipe, likedRecipes } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user, setUser] = useStateAlias<any>(null);

  useEffectAlias(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const pantryNames = useMemo(() => pantryList.map(p => p.name), [pantryList]);

  const rankedRecipes = useMemo(() => {
    return recipes
      .map((r) => ({ recipe: r, match: calculateMatch(pantryNames, r.ingredients) }))
      .sort((a, b) => b.match.percentage - a.match.percentage);
  }, [pantryNames]);

  const handleSwipe = (dir: 'left' | 'right') => {
    if (dir === 'right') {
      likeRecipe(rankedRecipes[currentIndex].recipe.id);
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const current = rankedRecipes[currentIndex];
  const next = rankedRecipes[currentIndex + 1];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">ChefStack</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pantry')}>
            <UtensilsCrossed className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/saved')} className="relative">
            <BookOpen className="h-5 w-5" />
            {likedRecipes.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                {likedRecipes.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-full max-w-md h-[480px]">
          {current ? (
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
                isTop={true}
              />
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <ChefHat className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                That's all for now!
              </h2>
              <p className="text-muted-foreground mb-6">
                You've seen all recipes. Add more ingredients or check your saved ones.
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
      {current && (
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
    </div>
  );
}
