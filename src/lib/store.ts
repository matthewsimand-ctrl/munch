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
}

interface AppState {
  userProfile: UserProfile;
  pantryList: PantryItem[];
  likedRecipes: string[];
  onboardingComplete: boolean;

  setUserProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  addPantryItem: (name: string, quantity?: string) => void;
  removePantryItem: (name: string) => void;
  updatePantryQuantity: (name: string, quantity: string) => void;
  addPantryItems: (items: string[]) => void;
  likeRecipe: (id: string) => void;
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
      onboardingComplete: false,

      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),

      completeOnboarding: () => set({ onboardingComplete: true }),

      addPantryItem: (item) =>
        set((state) => ({
          pantryList: state.pantryList.includes(item.toLowerCase().trim())
            ? state.pantryList
            : [...state.pantryList, item.toLowerCase().trim()],
        })),

      removePantryItem: (item) =>
        set((state) => ({
          pantryList: state.pantryList.filter((i) => i !== item),
        })),

      addPantryItems: (items) =>
        set((state) => {
          const existing = new Set(state.pantryList);
          const newItems = items
            .map(i => i.toLowerCase().trim())
            .filter(i => i && !existing.has(i));
          return { pantryList: [...state.pantryList, ...newItems] };
        }),

      likeRecipe: (id) =>
        set((state) => ({
          likedRecipes: state.likedRecipes.includes(id)
            ? state.likedRecipes
            : [...state.likedRecipes, id],
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
          onboardingComplete: false,
        }),
    }),
    { name: 'chefstack-storage' }
  )
);
