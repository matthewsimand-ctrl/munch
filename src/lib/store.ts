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

interface AppState {
  userProfile: UserProfile;
  pantryList: PantryItem[];
  likedRecipes: string[];
  savedApiRecipes: Record<string, any>;
  cachedNutrition: Record<string, any>;
  groceryRecipes: string[]; // recipe IDs explicitly added to grocery list
  customGroceryItems: CustomGroceryItem[]; // manually added grocery items
  onboardingComplete: boolean;
  tutorialComplete: boolean;
  showTutorial: boolean;

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
  completeTutorial: () => void;
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
      onboardingComplete: false,
      tutorialComplete: false,
      showTutorial: false,

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

      completeTutorial: () => set({ tutorialComplete: true }),

      resetStore: () =>
        set({
          userProfile: initialProfile,
          pantryList: [],
          likedRecipes: [],
          savedApiRecipes: {},
          cachedNutrition: {},
          groceryRecipes: [],
          customGroceryItems: [],
          onboardingComplete: false,
          tutorialComplete: false,
          showTutorial: false,
        }),
    }),
    { name: 'chefstack-storage' }
  )
);
