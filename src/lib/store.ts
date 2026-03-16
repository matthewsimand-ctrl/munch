import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeIngredients } from '@/lib/normalizeIngredients';
import { parseIngredientLine, suggestQuantityForItem } from '@/lib/ingredientText';

export interface UserProfile {
  dietaryRestrictions: string[];
  skillLevel: string;
  flavorProfiles: string[];
  cuisinePreferences: string[];
  groceryLocation: string;
  groceryCurrency: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  category?: string;
}

export interface CustomGroceryItem {
  id: string;
  name: string;
  quantity: string;
  category?: string;
  section?: string;
  qty?: string;
  checked?: boolean;
}

export interface MealPlanItem {
  id: string;
  weekStart: string;
  day: string;
  mealType: string;
  recipeName: string;
  recipeId: string;
  cookTime?: string;
  recipeSnapshot?: any;
}

export interface RecipeFolder {
  id: string;
  name: string;
  coverImage?: string;
  recipeIds: string[];
}

export interface KitchenSummary {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface AppState {
  storeOwnerUserId: string | null;
  userProfile: UserProfile;
  pantryList: PantryItem[];
  mealPlan: MealPlanItem[];
  likedRecipes: string[];
  savedApiRecipes: Record<string, any>;
  cachedNutrition: Record<string, any>;
  groceryRecipes: string[];
  customGroceryItems: CustomGroceryItem[];
  recipeMealTags: Record<string, string>; // recipeId -> meal type
  recipeTags: Record<string, string[]>; // recipeId -> custom user tags
  recipeIngredientOverrides: Record<string, string[]>; // recipeId -> user-edited ingredient list
  recipeFolders: RecipeFolder[];
  activeKitchenId: string | null;
  activeKitchenName: string | null;
  kitchenViewMode: 'solo' | 'kitchen';
  displayName: string;
  setStoreOwnerUserId: (userId: string | null) => void;
  setDisplayName: (name: string) => void;
  onboardingComplete: boolean;
  isGuest: boolean;
  setIsGuest: (val: boolean) => void;
  tutorialComplete: boolean;
  showTutorial: boolean;
  cookingStreak: number;
  lastCookedDate: string | null;
  totalMealsCooked: number;
  cookedRecipeIds: string[];
  totalXp: number;
  earnedBadges: string[];
  archiveBehavior: 'ask' | 'always' | 'never';
  chefAvatarUrl: string | null;
  shareCustomRecipesByDefault: boolean;
  recipeRatings: Record<string, number>;
  recipeCookCounts: Record<string, number>;
  cookModeTtsEnabled: boolean;

  setUserProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  setShowTutorial: (show: boolean) => void;
  addPantryItem: (name: string | { name: string; quantity?: string; category?: string }, quantity?: string, category?: string) => void;
  removePantryItem: (nameOrId: string) => void;
  updatePantryQuantity: (nameOrId: string, quantity: string) => void;
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => void;
  addPantryItems: (items: string[]) => void;
  likeRecipe: (id: string, recipeData?: any) => void;
  unlikeRecipe: (id: string) => void;
  cacheNutrition: (recipeId: string, data: any) => void;
  addToGrocery: (recipeId: string) => void;
  removeFromGrocery: (recipeId: string) => void;
  addCustomGroceryItem: (name: string, quantity?: string | { qty?: string; section?: string; category?: string }) => void;
  removeCustomGroceryItem: (nameOrId: string) => void;
  updateCustomGroceryQuantity: (nameOrId: string, quantity: string) => void;
  toggleGroceryItem: (id: string) => void;
  updateGroceryItem: (id: string, updates: Partial<CustomGroceryItem> & { qty?: string; section?: string }) => void;
  clearCheckedGroceryItems: () => void;
  addMealPlanItem: (item: Omit<MealPlanItem, 'id'>) => void;
  removeMealPlanItem: (id: string) => void;
  clearMealPlanWeek: (weekStart: string) => void;
  setRecipeMealTag: (recipeId: string, tag: string) => void;
  setRecipeTags: (recipeId: string, tags: string[]) => void;
  addRecipeTag: (recipeId: string, tag: string) => void;
  removeRecipeTag: (recipeId: string, tag: string) => void;
  setRecipeIngredients: (recipeId: string, ingredients: string[]) => void;
  createFolder: (name: string, coverImage?: string) => void;
  createCookbook: (name: string, recipeIds: string[], coverImage?: string) => void;
  setActiveKitchen: (kitchen: KitchenSummary | null) => void;
  addFolder: (name: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  updateFolderCover: (folderId: string, coverImage: string) => void;
  deleteFolder: (folderId: string) => void;
  removeFolder: (folderId: string) => void;
  addRecipeToFolder: (folderId: string, recipeId: string) => void;
  removeRecipeFromFolder: (folderId: string, recipeId: string) => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  markRecipeCooked: (recipeId: string) => void;
  addXp: (amount: number) => void;
  earnBadge: (badgeId: string) => void;
  setArchiveBehavior: (behavior: 'ask' | 'always' | 'never') => void;
  setChefAvatarUrl: (url: string | null) => void;
  setShareCustomRecipesByDefault: (enabled: boolean) => void;
  rateRecipe: (recipeId: string, rating: number) => void;
  setCookModeTtsEnabled: (enabled: boolean) => void;
  resetStore: () => void;
}

const initialProfile: UserProfile = {
  dietaryRestrictions: [],
  skillLevel: '',
  flavorProfiles: [],
  cuisinePreferences: [],
  groceryLocation: '',
  groceryCurrency: 'USD',
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      storeOwnerUserId: null,
      userProfile: initialProfile,
      pantryList: [],
      mealPlan: [],
      likedRecipes: [],
      savedApiRecipes: {},
      cachedNutrition: {},
      groceryRecipes: [],
      customGroceryItems: [],
      recipeMealTags: {},
      recipeTags: {},
      recipeIngredientOverrides: {},
      recipeFolders: [],
      activeKitchenId: null,
      activeKitchenName: null,
      kitchenViewMode: 'solo',
      displayName: '',
      setStoreOwnerUserId: (storeOwnerUserId) => set({ storeOwnerUserId }),
      setDisplayName: (displayName) => set({ displayName }),
      onboardingComplete: false,
      isGuest: false,
      setIsGuest: (val) => set({ isGuest: val }),
      tutorialComplete: false,
      showTutorial: false,
      cookingStreak: 0,
      lastCookedDate: null,
      totalMealsCooked: 0,
      cookedRecipeIds: [],
      totalXp: 0,
      earnedBadges: [],
      archiveBehavior: 'ask' as const,
      chefAvatarUrl: null,
      shareCustomRecipesByDefault: true,
      recipeRatings: {},
      recipeCookCounts: {},
      cookModeTtsEnabled: true,

      setShowTutorial: (show) => set({ showTutorial: show }),

      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),

      completeOnboarding: () => set({ onboardingComplete: true }),

      addPantryItem: (nameOrItem, quantity = '1', category) => {
        const input = typeof nameOrItem === 'string'
          ? { name: nameOrItem, quantity, category }
          : nameOrItem;
        const normalized = input.name.toLowerCase().trim();
        if (!normalized) return;

        set((state) => {
          const existingIndex = state.pantryList.findIndex(p => p.name === normalized);
          if (existingIndex >= 0) {
            const newList = [...state.pantryList];
            const existing = newList[existingIndex];
            const currentQty = parseFloat(existing.quantity || '0');
            const addedQty = parseFloat(input.quantity || '1');

            if (!isNaN(currentQty) && !isNaN(addedQty)) {
              newList[existingIndex] = {
                ...existing,
                quantity: String(currentQty + addedQty),
                category: input.category || existing.category
              };
            } else {
              // If not numeric, just update category if provided
              newList[existingIndex] = {
                ...existing,
                category: input.category || existing.category
              };
            }
            return { pantryList: newList };
          }
          return {
            pantryList: [...state.pantryList, {
              id: crypto.randomUUID(),
              name: normalized,
              quantity: input.quantity ?? suggestQuantityForItem(normalized),
              category: input.category,
            }],
          };
        });
      },

      removePantryItem: (nameOrId) =>
        set((state) => ({
          pantryList: state.pantryList.filter((p) => p.id !== nameOrId && p.name !== nameOrId),
        })),

      updatePantryQuantity: (nameOrId, quantity) =>
        set((state) => ({
          pantryList: state.pantryList.map(p =>
            p.id === nameOrId || p.name === nameOrId ? { ...p, quantity } : p
          ),
        })),

      updatePantryItem: (id, updates) =>
        set((state) => ({
          pantryList: state.pantryList.map((item) =>
            item.id === id
              ? {
                ...item,
                ...updates,
                name: updates.name ? updates.name.toLowerCase().trim() : item.name,
              }
              : item
          ),
        })),

      addPantryItems: (items) =>
        set((state) => {
          const newList = [...state.pantryList];
          items.forEach(name => {
            const normalized = name.toLowerCase().trim();
            if (!normalized) return;
            const existingIndex = newList.findIndex(p => p.name === normalized);
            if (existingIndex >= 0) {
              const currentQty = parseFloat(newList[existingIndex].quantity || '0');
              if (!isNaN(currentQty)) {
                newList[existingIndex] = {
                  ...newList[existingIndex],
                  quantity: String(currentQty + 1)
                };
              }
            } else {
              newList.push({ id: crypto.randomUUID(), name: normalized, quantity: '1' });
            }
          });
          return { pantryList: newList };
        }),

      likeRecipe: (id, recipeData) =>
        set((state) => ({
          likedRecipes: state.likedRecipes.includes(id)
            ? state.likedRecipes
            : [...state.likedRecipes, id],
          savedApiRecipes: recipeData
            ? {
              ...state.savedApiRecipes,
              [id]: {
                ...recipeData,
                ingredients: normalizeIngredients(recipeData.ingredients, recipeData.raw_api_payload),
              },
            }
            : state.savedApiRecipes,
        })),

      unlikeRecipe: (id) =>
        set((state) => {
          const nextSavedApiRecipes = { ...state.savedApiRecipes };
          delete nextSavedApiRecipes[id];

          return {
            likedRecipes: state.likedRecipes.filter((r) => r !== id),
            savedApiRecipes: nextSavedApiRecipes,
            groceryRecipes: state.groceryRecipes.filter((r) => r !== id),
            recipeFolders: state.recipeFolders.map(f => ({
              ...f,
              recipeIds: f.recipeIds.filter(r => r !== id),
            })),
          };
        }),

      cacheNutrition: (recipeId, data) =>
        set((state) => ({
          cachedNutrition: { ...state.cachedNutrition, [recipeId]: data },
        })),

      addToGrocery: (recipeId) =>
        set((state) => ({
          groceryRecipes: state.groceryRecipes.includes(recipeId)
            ? state.groceryRecipes
            : [...state.groceryRecipes, recipeId],
        })),

      removeFromGrocery: (recipeId) =>
        set((state) => ({
          groceryRecipes: state.groceryRecipes.filter(id => id !== recipeId),
        })),

      addCustomGroceryItem: (name, quantity = '1') => {
        const explicit = typeof quantity === 'string' ? { qty: quantity } : (quantity || {});
        const parsedIngredient = parseIngredientLine(name);
        const normalizedName = (parsedIngredient.name || name).toLowerCase().trim();
        const normalized = normalizedName;
        if (!normalized) return;

        const parsed = {
          ...explicit,
          qty: explicit.qty ?? parsedIngredient.quantity ?? suggestQuantityForItem(normalizedName),
        };

        set((state) => {
          const existingIndex = state.customGroceryItems.findIndex(i => i.name === normalized);
          if (existingIndex >= 0) {
            const newList = [...state.customGroceryItems];
            const existing = newList[existingIndex];
            const currentQty = parseFloat(existing.quantity || '0');
            const addedQty = parseFloat(parsed.qty || '1');

            if (!isNaN(currentQty) && !isNaN(addedQty)) {
              newList[existingIndex] = {
                ...existing,
                quantity: String(currentQty + addedQty),
                category: parsed.section ?? parsed.category ?? existing.category
              };
            } else {
              newList[existingIndex] = {
                ...existing,
                category: parsed.section ?? parsed.category ?? existing.category
              };
            }
            return { customGroceryItems: newList };
          }
          return {
            customGroceryItems: [...state.customGroceryItems, {
              id: crypto.randomUUID(),
              name: normalized,
              quantity: parsed.qty ?? suggestQuantityForItem(normalized),
              category: parsed.section ?? parsed.category,
              checked: false,
            }],
          };
        });
      },

      removeCustomGroceryItem: (nameOrId) =>
        set((state) => ({
          customGroceryItems: state.customGroceryItems.filter(i => i.id !== nameOrId && i.name !== nameOrId),
        })),

      updateCustomGroceryQuantity: (nameOrId, quantity) =>
        set((state) => ({
          customGroceryItems: state.customGroceryItems.map(i =>
            i.id === nameOrId || i.name === nameOrId ? { ...i, quantity } : i
          ),
        })),

      toggleGroceryItem: (id) =>
        set((state) => ({
          customGroceryItems: state.customGroceryItems.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          ),
        })),

      updateGroceryItem: (id, updates) =>
        set((state) => ({
          customGroceryItems: state.customGroceryItems.map((item) =>
            item.id === id
              ? {
                ...item,
                ...updates,
                quantity: updates.qty ?? updates.quantity ?? item.quantity,
                category: updates.section ?? updates.category ?? item.category,
              }
              : item
          ),
        })),

      clearCheckedGroceryItems: () =>
        set((state) => ({
          customGroceryItems: state.customGroceryItems.filter((item) => !item.checked),
        })),

      addMealPlanItem: (item) =>
        set((state) => {
          const existingIndex = state.mealPlan.findIndex(
            (m) => m.weekStart === item.weekStart && m.day === item.day && m.mealType === item.mealType
          );
          if (existingIndex >= 0) {
            return {
              mealPlan: state.mealPlan.map((m, idx) =>
                idx === existingIndex ? { ...m, ...item } : m
              ),
            };
          }
          return { mealPlan: [...state.mealPlan, { ...item, id: crypto.randomUUID() }] };
        }),

      removeMealPlanItem: (id) =>
        set((state) => ({
          mealPlan: state.mealPlan.filter((item) => item.id !== id),
        })),

      clearMealPlanWeek: (weekStart) =>
        set((state) => ({
          mealPlan: state.mealPlan.filter((item) => item.weekStart !== weekStart),
        })),

      setRecipeMealTag: (recipeId, tag) =>
        set((state) => ({
          recipeMealTags: { ...state.recipeMealTags, [recipeId]: tag },
        })),

      setRecipeTags: (recipeId, tags) =>
        set((state) => ({
          recipeTags: { ...state.recipeTags, [recipeId]: tags },
        })),

      addRecipeTag: (recipeId, tag) =>
        set((state) => {
          const current = state.recipeTags[recipeId] || [];
          const normalized = tag.trim();
          if (!normalized || current.includes(normalized)) return state;
          return { recipeTags: { ...state.recipeTags, [recipeId]: [...current, normalized] } };
        }),

      removeRecipeTag: (recipeId, tag) =>
        set((state) => ({
          recipeTags: { ...state.recipeTags, [recipeId]: (state.recipeTags[recipeId] || []).filter(t => t !== tag) },
        })),

      setRecipeIngredients: (recipeId, ingredients) =>
        set((state) => ({
          recipeIngredientOverrides: {
            ...state.recipeIngredientOverrides,
            [recipeId]: ingredients.map((ing) => ing.trim()).filter(Boolean),
          },
        })),

      createFolder: (name, coverImage) =>
        set((state) => ({
          recipeFolders: [
            ...state.recipeFolders,
            { id: crypto.randomUUID(), name, coverImage, recipeIds: [] },
          ],
        })),

      createCookbook: (name, recipeIds, coverImage) =>
        set((state) => ({
          recipeFolders: [
            ...state.recipeFolders,
            {
              id: crypto.randomUUID(),
              name,
              coverImage,
              recipeIds: Array.from(new Set(recipeIds)),
            },
          ],
        })),

      setActiveKitchen: (kitchen) => set({
        activeKitchenId: kitchen?.id ?? null,
        activeKitchenName: kitchen?.name ?? null,
        kitchenViewMode: kitchen ? 'kitchen' : 'solo',
      }),

      addFolder: (name) =>
        set((state) => ({
          recipeFolders: [
            ...state.recipeFolders,
            { id: crypto.randomUUID(), name, recipeIds: [] },
          ],
        })),

      renameFolder: (folderId, name) =>
        set((state) => ({
          recipeFolders: state.recipeFolders.map(f =>
            f.id === folderId ? { ...f, name } : f
          ),
        })),

      updateFolderCover: (folderId, coverImage) =>
        set((state) => ({
          recipeFolders: state.recipeFolders.map(f =>
            f.id === folderId ? { ...f, coverImage } : f
          ),
        })),

      deleteFolder: (folderId) =>
        set((state) => ({
          recipeFolders: state.recipeFolders.filter(f => f.id !== folderId),
        })),

      removeFolder: (folderId) =>
        set((state) => ({
          recipeFolders: state.recipeFolders.filter((f) => f.id !== folderId && f.name !== folderId),
        })),

      addRecipeToFolder: (folderId, recipeId) =>
        set((state) => ({
          recipeFolders: state.recipeFolders.map(f =>
            f.id === folderId && !f.recipeIds.includes(recipeId)
              ? { ...f, recipeIds: [...f.recipeIds, recipeId] }
              : f
          ),
        })),

      removeRecipeFromFolder: (folderId, recipeId) =>
        set((state) => ({
          recipeFolders: state.recipeFolders.map(f =>
            f.id === folderId
              ? { ...f, recipeIds: f.recipeIds.filter(r => r !== recipeId) }
              : f
          ),
        })),

      completeTutorial: () => set({ tutorialComplete: true }),

      resetTutorial: () => set({ tutorialComplete: false, showTutorial: true }),

      markRecipeCooked: (recipeId) =>
        set((state) => {
          const today = new Date().toISOString().slice(0, 10);
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          let newStreak = state.cookingStreak;
          if (state.lastCookedDate === today) {
            // Already cooked today, no streak change
          } else if (state.lastCookedDate === yesterday) {
            newStreak = state.cookingStreak + 1;
          } else {
            newStreak = 1;
          }
          return {
            cookingStreak: newStreak,
            lastCookedDate: today,
            totalMealsCooked: state.totalMealsCooked + 1,
            cookedRecipeIds: state.cookedRecipeIds.includes(recipeId)
              ? state.cookedRecipeIds
              : [...state.cookedRecipeIds, recipeId],
            recipeCookCounts: {
              ...state.recipeCookCounts,
              [recipeId]: (state.recipeCookCounts[recipeId] || 0) + 1,
            },
          };
        }),

      addXp: (amount) =>
        set((state) => ({ totalXp: state.totalXp + amount })),

      earnBadge: (badgeId) =>
        set((state) => ({
          earnedBadges: state.earnedBadges.includes(badgeId)
            ? state.earnedBadges
            : [...state.earnedBadges, badgeId],
        })),

      setArchiveBehavior: (behavior) => set({ archiveBehavior: behavior }),

      setChefAvatarUrl: (url) => set({ chefAvatarUrl: url }),

      setShareCustomRecipesByDefault: (enabled) => set({ shareCustomRecipesByDefault: enabled }),

      rateRecipe: (recipeId, rating) =>
        set((state) => ({
          recipeRatings: {
            ...state.recipeRatings,
            [recipeId]: Math.max(1, Math.min(5, Math.round(rating))),
          },
        })),

      setCookModeTtsEnabled: (enabled) => set({ cookModeTtsEnabled: enabled }),

      resetStore: () =>
        set({
          userProfile: initialProfile,
          pantryList: [],
          mealPlan: [],
          likedRecipes: [],
          savedApiRecipes: {},
          cachedNutrition: {},
          groceryRecipes: [],
          customGroceryItems: [],
          recipeMealTags: {},
          recipeIngredientOverrides: {},
          recipeFolders: [],
          activeKitchenId: null,
          activeKitchenName: null,
          displayName: '',
          storeOwnerUserId: null,
          onboardingComplete: false,
          isGuest: false,
          tutorialComplete: false,
          showTutorial: false,
          cookingStreak: 0,
          lastCookedDate: null,
          totalMealsCooked: 0,
          cookedRecipeIds: [],
          totalXp: 0,
          earnedBadges: [],
          archiveBehavior: 'ask' as const,
          chefAvatarUrl: null,
          shareCustomRecipesByDefault: true,
          recipeRatings: {},
          recipeCookCounts: {},
          cookModeTtsEnabled: true,
        }),
    }),
    { name: 'chefstack-storage' }
  )
);
