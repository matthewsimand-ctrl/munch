import { ChefHat } from 'lucide-react';
import type { Recipe } from '@/data/recipes';
import { getRecipeSourceHostname, isImportedCommunityRecipe, isImportedUrlRecipe, isMunchSeedRecipe } from '@/lib/recipeAttribution';

interface RecipeAttributionIconProps {
  recipe: Recipe;
  avatarUrl?: string | null;
  sizeClassName?: string;
  className?: string;
}

function getChefInitial(recipe: Recipe) {
  const value = recipe.chef?.trim() || recipe.name?.trim() || 'C';
  return value.charAt(0).toUpperCase();
}

export default function RecipeAttributionIcon({
  recipe,
  avatarUrl,
  sizeClassName = 'h-3.5 w-3.5',
  className = '',
}: RecipeAttributionIconProps) {
  if (isMunchSeedRecipe(recipe)) {
    return (
      <img
        src="/favicon.ico"
        alt="Munch"
        className={`${sizeClassName} shrink-0 rounded-sm object-cover ${className}`.trim()}
      />
    );
  }

  if (!isImportedCommunityRecipe(recipe)) return null;

  if (isImportedUrlRecipe(recipe)) {
    const sourceHostname = getRecipeSourceHostname(recipe.source_url);
    if (!sourceHostname) return null;

    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${sourceHostname}&sz=32`}
        alt=""
        className={`${sizeClassName} shrink-0 ${className}`.trim()}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={recipe.chef ? `${recipe.chef} avatar` : 'Chef avatar'}
        className={`${sizeClassName} shrink-0 rounded-full object-cover ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`${sizeClassName} shrink-0 rounded-full bg-orange-100 text-[9px] font-bold text-orange-700 flex items-center justify-center overflow-hidden ${className}`.trim()}
      aria-hidden="true"
    >
      {recipe.chef ? getChefInitial(recipe) : <ChefHat className="h-2.5 w-2.5" />}
    </span>
  );
}
