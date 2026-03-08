export interface Recipe {
  id: string;
  name: string;
  image: string;
  cook_time: string;
  difficulty: string;
  ingredients: string[];
  tags: string[];
  instructions: string[];
  cuisine?: string | null;
  source?: string;
  created_by?: string | null;
  is_public?: boolean;
}

// Legacy compat alias
export type { Recipe as RecipeType };
