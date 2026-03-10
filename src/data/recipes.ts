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
  source_url?: string;
  raw_api_payload?: unknown;
  created_by?: string | null;
  is_public?: boolean;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

// Legacy compat alias
export type { Recipe as RecipeType };
