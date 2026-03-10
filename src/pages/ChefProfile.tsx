import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/data/recipes';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { normalizeRecipe } from '@/lib/normalizeRecipe';

export default function ChefProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['chef-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
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
      return (data || []).map((r: any) => normalizeRecipe(r));
    },
    enabled: !!userId,
  });

  const displayName = profile?.display_name || 'Chef';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
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
          className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-card border border-border"
        >
          {profile?.avatar_url ? (
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
            <p className="text-sm text-muted-foreground">
              {recipes.length} public recipe{recipes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </motion.div>

        {/* Recipes grid */}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          {firstName}'s Recipes
        </h3>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No public recipes yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recipes.map((recipe, i) => (
              <motion.button
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/swipe`)}
                className="rounded-xl overflow-hidden bg-card border border-border text-left hover:border-primary/30 transition-colors"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
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
      <BottomNav />
    </div>
  );
}
