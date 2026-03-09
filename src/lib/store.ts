import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  dietaryRestrictions: string[];
  skillLevel: string;
  flavorProfiles: string[];
  cuisinePreferences: string[];
}

export interface PantryItem {
  name: string;
  quantity: string;
  category?: string;
}

export interface CustomGroceryItem {
  name: string;
  quantity: string;
  category?: string;
}

export interface RecipeFolder {
  id: string;
  name: string;
  coverImage?: string;
  recipeIds: string[];
}

interface AppState {
  userProfile: UserProfile;
  pantryList: PantryItem[];
  likedRecipes: string[];
  savedApiRecipes: Record<string, any>;
  cachedNutrition: Record<string, any>;
  groceryRecipes: string[];
  customGroceryItems: CustomGroceryItem[];
  recipeMealTags: Record<string, string>; // recipeId -> meal type
  recipeTags: Record<string, string[]>; // recipeId -> custom user tags
  recipeFolders: RecipeFolder[];
  onboardingComplete: boolean;
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

  setUserProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  setShowTutorial: (show: boolean) => void;
  addPantryItem: (name: string, quantity?: string, category?: string) => void;
  removePantryItem: (name: string) => void;
  updatePantryQuantity: (name: string, quantity: string) => void;
  addPantryItems: (items: string[]) => void;
  likeRecipe: (id: string, recipeData?: any) => void;
  unlikeRecipe: (id: string) => void;
  cacheNutrition: (recipeId: string, data: any) => void;
  addToGrocery: (recipeId: string) => void;
  removeFromGrocery: (recipeId: string) => void;
  addCustomGroceryItem: (name: string, quantity?: string) => void;
  removeCustomGroceryItem: (name: string) => void;
  updateCustomGroceryQuantity: (name: string, quantity: string) => void;
  setRecipeMealTag: (recipeId: string, tag: string) => void;
  setRecipeTags: (recipeId: string, tags: string[]) => void;
  addRecipeTag: (recipeId: string, tag: string) => void;
  removeRecipeTag: (recipeId: string, tag: string) => void;
  createFolder: (name: string, coverImage?: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  updateFolderCover: (folderId: string, coverImage: string) => void;
  deleteFolder: (folderId: string) => void;
  addRecipeToFolder: (folderId: string, recipeId: string) => void;
  removeRecipeFromFolder: (folderId: string, recipeId: string) => void;
  completeTutorial: () => void;
  markRecipeCooked: (recipeId: string) => void;
  addXp: (amount: number) => void;
  earnBadge: (badgeId: string) => void;
  setArchiveBehavior: (behavior: 'ask' | 'always' | 'never') => void;
  setChefAvatarUrl: (url: string | null) => void;
  resetStore: () => void;
}

const initialProfile: UserProfile = {
  dietaryRestrictions: [],
  skillLevel: '',
  flavorProfiles: [],
  cuisinePreferences: [],
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: initialProfile,
      pantryList: [],
      likedRecipes: [],
      savedApiRecipes: {},
      cachedNutrition: {},
      groceryRecipes: [],
      customGroceryItems: [],
      recipeMealTags: {},
      recipeTags: {},
      recipeFolders: [],
      onboardingComplete: false,
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

      setShowTutorial: (show) => set({ showTutorial: show }),

      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),

      completeOnboarding: () => set({ onboardingComplete: true }),

      addPantryItem: (name, quantity = '1', category) => {
        const normalized = name.toLowerCase().trim();
        set((state) => ({
          pantryList: state.pantryList.some(p => p.name === normalized)
            ? state.pantryList
            : [...state.pantryList, { name: normalized, quantity, category }],
        }));
      },

      removePantryItem: (name) =>
        set((state) => ({
          pantryList: state.pantryList.filter((p) => p.name !== name),
        })),

      updatePantryQuantity: (name, quantity) =>
        set((state) => ({
          pantryList: state.pantryList.map(p =>
            p.name === name ? { ...p, quantity } : p
          ),
        })),

      addPantryItems: (items) =>
        set((state) => {
          const existing = new Set(state.pantryList.map(p => p.name));
          const newItems: PantryItem[] = items
            .map(i => i.toLowerCase().trim())
            .filter(i => i && !existing.has(i))
            .map(name => ({ name, quantity: '1' }));
          return { pantryList: [...state.pantryList, ...newItems] };
        }),

      likeRecipe: (id, recipeData) =>
        set((state) => ({
          likedRecipes: state.likedRecipes.includes(id)
            ? state.likedRecipes
            : [...state.likedRecipes, id],
          savedApiRecipes: recipeData
            ? { ...state.savedApiRecipes, [id]: recipeData }
            : state.savedApiRecipes,
        })),

      unlikeRecipe: (id) =>
        set((state) => ({
          likedRecipes: state.likedRecipes.filter((r) => r !== id),
          groceryRecipes: state.groceryRecipes.filter((r) => r !== id),
          recipeFolders: state.recipeFolders.map(f => ({
            ...f,
            recipeIds: f.recipeIds.filter(r => r !== id),
          })),
        })),

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
        const normalized = name.toLowerCase().trim();
        set((state) => ({
          customGroceryItems: state.customGroceryItems.some(i => i.name === normalized)
            ? state.customGroceryItems
            : [...state.customGroceryItems, { name: normalized, quantity }],
        }));
      },

      removeCustomGroceryItem: (name) =>
        set((state) => ({
          customGroceryItems: state.customGroceryItems.filter(i => i.name !== name),
        })),

      updateCustomGroceryQuantity: (name, quantity) =>
        set((state) => ({
          customGroceryItems: state.customGroceryItems.map(i =>
            i.name === name ? { ...i, quantity } : i
          ),
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

      createFolder: (name, coverImage) =>
        set((state) => ({
          recipeFolders: [
            ...state.recipeFolders,
            { id: crypto.randomUUID(), name, coverImage, recipeIds: [] },
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

      resetStore: () =>
        set({
          userProfile: initialProfile,
          pantryList: [],
          likedRecipes: [],
          savedApiRecipes: {},
          cachedNutrition: {},
          groceryRecipes: [],
          customGroceryItems: [],
          recipeMealTags: {},
          recipeFolders: [],
          onboardingComplete: false,
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
        }),
    }),
    { name: 'chefstack-storage' }
  )
);
