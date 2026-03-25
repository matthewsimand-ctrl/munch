import { useEffect, useRef } from 'react';
import { supabase as typedSupabase } from '@/integrations/supabase/client';
import { useStore, type AppState } from '@/lib/store';

// Cast to `any` — the `user_app_state` table is not in the generated types yet
// but exists at runtime. ENABLE_CLOUD_STORE_SYNC is false so this code is dormant.
const supabase = typedSupabase as any;

type UserProfile = AppState['userProfile'];

type CloudStoreSnapshot = {
  userProfile: AppState['userProfile'];
  pantryList: AppState['pantryList'];
  mealPlan: AppState['mealPlan'];
  likedRecipes: AppState['likedRecipes'];
  savedApiRecipes: AppState['savedApiRecipes'];
  cachedNutrition: AppState['cachedNutrition'];
  groceryRecipes: AppState['groceryRecipes'];
  customGroceryItems: AppState['customGroceryItems'];
  recipeMealTags: AppState['recipeMealTags'];
  recipeTags: AppState['recipeTags'];
  recipeIngredientOverrides: AppState['recipeIngredientOverrides'];
  recipeFolders: AppState['recipeFolders'];
  displayName: AppState['displayName'];
  dashboardHeroImageMode: AppState['dashboardHeroImageMode'];
  dashboardHeroImageSeed: AppState['dashboardHeroImageSeed'];
  onboardingComplete: AppState['onboardingComplete'];
  cookingStreak: AppState['cookingStreak'];
  lastCookedDate: AppState['lastCookedDate'];
  totalMealsCooked: AppState['totalMealsCooked'];
  cookedRecipeIds: AppState['cookedRecipeIds'];
  totalXp: AppState['totalXp'];
  earnedBadges: AppState['earnedBadges'];
  archiveBehavior: AppState['archiveBehavior'];
  chefAvatarUrl: AppState['chefAvatarUrl'];
  shareCustomRecipesByDefault: AppState['shareCustomRecipesByDefault'];
  recipeRatings: AppState['recipeRatings'];
  recipeCookCounts: AppState['recipeCookCounts'];
  cookModeTtsEnabled: AppState['cookModeTtsEnabled'];
};

function sanitizeStoredImage(image: unknown) {
  const value = typeof image === 'string' ? image.trim() : '';
  if (!value) return '';
  if (value.startsWith('data:image/') && value.length > 2000) {
    return '';
  }
  return value;
}

function sanitizeStoredRecipe(recipe: any) {
  if (!recipe || typeof recipe !== 'object') return recipe;

  return {
    ...recipe,
    image: sanitizeStoredImage(recipe.image),
    raw_api_payload: undefined,
  };
}

function buildCloudSnapshot(state: AppState): CloudStoreSnapshot {
  return {
    userProfile: state.userProfile,
    pantryList: state.pantryList,
    mealPlan: state.mealPlan.map((item) => ({
      ...item,
      recipeSnapshot: item.recipeSnapshot ? sanitizeStoredRecipe(item.recipeSnapshot) : undefined,
    })),
    likedRecipes: state.likedRecipes,
    savedApiRecipes: Object.fromEntries(
      Object.entries(state.savedApiRecipes).map(([id, recipe]) => [id, sanitizeStoredRecipe(recipe)]),
    ),
    cachedNutrition: state.cachedNutrition,
    groceryRecipes: state.groceryRecipes,
    customGroceryItems: state.customGroceryItems,
    recipeMealTags: state.recipeMealTags,
    recipeTags: state.recipeTags,
    recipeIngredientOverrides: state.recipeIngredientOverrides,
    recipeFolders: state.recipeFolders,
    displayName: state.displayName,
    dashboardHeroImageMode: state.dashboardHeroImageMode,
    dashboardHeroImageSeed: state.dashboardHeroImageSeed,
    onboardingComplete: state.onboardingComplete,
    cookingStreak: state.cookingStreak,
    lastCookedDate: state.lastCookedDate,
    totalMealsCooked: state.totalMealsCooked,
    cookedRecipeIds: state.cookedRecipeIds,
    totalXp: state.totalXp,
    earnedBadges: state.earnedBadges,
    archiveBehavior: state.archiveBehavior,
    chefAvatarUrl: state.chefAvatarUrl,
    shareCustomRecipesByDefault: state.shareCustomRecipesByDefault,
    recipeRatings: state.recipeRatings,
    recipeCookCounts: state.recipeCookCounts,
    cookModeTtsEnabled: state.cookModeTtsEnabled,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function applyCloudSnapshot(snapshot: unknown) {
  if (!isObject(snapshot)) return;

  const nextState: Partial<AppState> = {};

  if (isObject(snapshot.userProfile)) nextState.userProfile = snapshot.userProfile as unknown as UserProfile;
  if (Array.isArray(snapshot.pantryList)) nextState.pantryList = snapshot.pantryList as AppState['pantryList'];
  if (Array.isArray(snapshot.mealPlan)) nextState.mealPlan = snapshot.mealPlan as AppState['mealPlan'];
  if (Array.isArray(snapshot.likedRecipes)) nextState.likedRecipes = snapshot.likedRecipes as AppState['likedRecipes'];
  if (isObject(snapshot.savedApiRecipes)) nextState.savedApiRecipes = snapshot.savedApiRecipes as AppState['savedApiRecipes'];
  if (isObject(snapshot.cachedNutrition)) nextState.cachedNutrition = snapshot.cachedNutrition as AppState['cachedNutrition'];
  if (Array.isArray(snapshot.groceryRecipes)) nextState.groceryRecipes = snapshot.groceryRecipes as AppState['groceryRecipes'];
  if (Array.isArray(snapshot.customGroceryItems)) nextState.customGroceryItems = snapshot.customGroceryItems as AppState['customGroceryItems'];
  if (isObject(snapshot.recipeMealTags)) nextState.recipeMealTags = snapshot.recipeMealTags as AppState['recipeMealTags'];
  if (isObject(snapshot.recipeTags)) nextState.recipeTags = snapshot.recipeTags as AppState['recipeTags'];
  if (isObject(snapshot.recipeIngredientOverrides)) nextState.recipeIngredientOverrides = snapshot.recipeIngredientOverrides as AppState['recipeIngredientOverrides'];
  if (Array.isArray(snapshot.recipeFolders)) nextState.recipeFolders = snapshot.recipeFolders as AppState['recipeFolders'];
  if (typeof snapshot.displayName === 'string') nextState.displayName = snapshot.displayName;
  if (snapshot.dashboardHeroImageMode === 'daily' || snapshot.dashboardHeroImageMode === 'manual') nextState.dashboardHeroImageMode = snapshot.dashboardHeroImageMode;
  if (typeof snapshot.dashboardHeroImageSeed === 'number') nextState.dashboardHeroImageSeed = snapshot.dashboardHeroImageSeed;
  if (typeof snapshot.onboardingComplete === 'boolean') nextState.onboardingComplete = snapshot.onboardingComplete;
  if (typeof snapshot.cookingStreak === 'number') nextState.cookingStreak = snapshot.cookingStreak;
  if (typeof snapshot.lastCookedDate === 'string' || snapshot.lastCookedDate === null) nextState.lastCookedDate = snapshot.lastCookedDate as string | null;
  if (typeof snapshot.totalMealsCooked === 'number') nextState.totalMealsCooked = snapshot.totalMealsCooked;
  if (Array.isArray(snapshot.cookedRecipeIds)) nextState.cookedRecipeIds = snapshot.cookedRecipeIds as AppState['cookedRecipeIds'];
  if (typeof snapshot.totalXp === 'number') nextState.totalXp = snapshot.totalXp;
  if (Array.isArray(snapshot.earnedBadges)) nextState.earnedBadges = snapshot.earnedBadges as AppState['earnedBadges'];
  if (snapshot.archiveBehavior === 'ask' || snapshot.archiveBehavior === 'always' || snapshot.archiveBehavior === 'never') {
    nextState.archiveBehavior = snapshot.archiveBehavior;
  }
  if (typeof snapshot.chefAvatarUrl === 'string' || snapshot.chefAvatarUrl === null) nextState.chefAvatarUrl = snapshot.chefAvatarUrl as string | null;
  if (typeof snapshot.shareCustomRecipesByDefault === 'boolean') nextState.shareCustomRecipesByDefault = snapshot.shareCustomRecipesByDefault;
  if (isObject(snapshot.recipeRatings)) nextState.recipeRatings = snapshot.recipeRatings as AppState['recipeRatings'];
  if (isObject(snapshot.recipeCookCounts)) nextState.recipeCookCounts = snapshot.recipeCookCounts as AppState['recipeCookCounts'];
  if (typeof snapshot.cookModeTtsEnabled === 'boolean') nextState.cookModeTtsEnabled = snapshot.cookModeTtsEnabled;

  if (Object.keys(nextState).length > 0) {
    useStore.setState(nextState);
  }
}

async function persistSnapshot(userId: string, snapshot: CloudStoreSnapshot) {
  await supabase.from('user_app_state').upsert(
    {
      user_id: userId,
      state: snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export function useCloudStoreSync() {
  const storeOwnerUserId = useStore((state) => state.storeOwnerUserId);
  const loadedUserIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const lastSerializedRef = useRef<string>('');
  const writeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      readyRef.current = false;
      loadedUserIdRef.current = storeOwnerUserId;
      lastSerializedRef.current = '';

      if (writeTimeoutRef.current) {
        window.clearTimeout(writeTimeoutRef.current);
        writeTimeoutRef.current = null;
      }

      if (!storeOwnerUserId) {
        return;
      }

      const { data, error } = await supabase
        .from('user_app_state')
        .select('state')
        .eq('user_id', storeOwnerUserId)
        .maybeSingle();

      if (cancelled || loadedUserIdRef.current !== storeOwnerUserId) return;

      if (!error && data?.state) {
        applyCloudSnapshot(data.state);
      }

      const snapshot = buildCloudSnapshot(useStore.getState());
      const serialized = JSON.stringify(snapshot);
      lastSerializedRef.current = serialized;
      readyRef.current = true;

      if (!data) {
        void persistSnapshot(storeOwnerUserId, snapshot);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [storeOwnerUserId]);

  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      if (!storeOwnerUserId || !readyRef.current || loadedUserIdRef.current !== storeOwnerUserId) {
        return;
      }

      const snapshot = buildCloudSnapshot(state);
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSerializedRef.current) {
        return;
      }

      if (writeTimeoutRef.current) {
        window.clearTimeout(writeTimeoutRef.current);
      }

      writeTimeoutRef.current = window.setTimeout(() => {
        if (!storeOwnerUserId || loadedUserIdRef.current !== storeOwnerUserId) {
          return;
        }
        lastSerializedRef.current = serialized;
        void persistSnapshot(storeOwnerUserId, snapshot);
      }, 700);
    });

    return () => {
      unsubscribe();
      if (writeTimeoutRef.current) {
        window.clearTimeout(writeTimeoutRef.current);
        writeTimeoutRef.current = null;
      }
    };
  }, [storeOwnerUserId]);
}
