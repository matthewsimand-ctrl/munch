import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  dietaryRestrictions: string[];
  skillLevel: string;
  flavorProfiles: string[];
}

export interface PantryItem {
  name: string;
  quantity: string;
  category?: string;
}

interface AppState {
  userProfile: UserProfile;
  pantryList: PantryItem[];
  likedRecipes: string[];
  savedApiRecipes: Record<string, any>;
  onboardingComplete: boolean;

  setUserProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  addPantryItem: (name: string, quantity?: string, category?: string) => void;
  removePantryItem: (name: string) => void;
  updatePantryQuantity: (name: string, quantity: string) => void;
  addPantryItems: (items: string[]) => void;
  likeRecipe: (id: string, recipeData?: any) => void;
  unlikeRecipe: (id: string) => void;
  resetStore: () => void;
}


const initialProfile: UserProfile = {
  dietaryRestrictions: [],
  skillLevel: '',
  flavorProfiles: [],
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: initialProfile,
      pantryList: [],
      likedRecipes: [],
      savedApiRecipes: {},
      onboardingComplete: false,

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
        })),

      resetStore: () =>
        set({
          userProfile: initialProfile,
          pantryList: [],
          likedRecipes: [],
          savedApiRecipes: {},
          onboardingComplete: false,
        }),
    }),
    { name: 'chefstack-storage' }
  )
);
