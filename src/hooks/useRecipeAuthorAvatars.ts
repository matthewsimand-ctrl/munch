import { useEffect, useMemo, useState } from 'react';
import type { Recipe } from '@/data/recipes';
import { supabase } from '@/integrations/supabase/client';
import { isImportedCommunityRecipe, isImportedUrlRecipe } from '@/lib/recipeAttribution';

export function useRecipeAuthorAvatars(recipes: Recipe[]) {
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  const authorIds = useMemo(() => {
    const ids = new Set<string>();

    recipes.forEach((recipe) => {
      if (!isImportedCommunityRecipe(recipe) || isImportedUrlRecipe(recipe) || !recipe.created_by) return;
      ids.add(recipe.created_by);
    });

    return Array.from(ids).sort();
  }, [recipes]);

  useEffect(() => {
    let cancelled = false;

    if (authorIds.length === 0) {
      setAvatarMap({});
      return;
    }

    const loadAvatars = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', authorIds);

      if (cancelled || error) return;

      const nextMap: Record<string, string> = {};
      (data || []).forEach((profile) => {
        if (profile.user_id && profile.avatar_url) {
          nextMap[profile.user_id] = profile.avatar_url;
        }
      });

      setAvatarMap(nextMap);
    };

    void loadAvatars();

    return () => {
      cancelled = true;
    };
  }, [authorIds]);

  return avatarMap;
}
