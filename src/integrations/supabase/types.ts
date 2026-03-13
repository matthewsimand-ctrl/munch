export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      kitchen_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invite_token: string
          invited_by: string
          kitchen_id: string
          role: Database["public"]["Enums"]["kitchen_member_role"]
          status: Database["public"]["Enums"]["kitchen_invite_status"]
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invite_token?: string
          invited_by: string
          kitchen_id: string
          role?: Database["public"]["Enums"]["kitchen_member_role"]
          status?: Database["public"]["Enums"]["kitchen_invite_status"]
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invite_token?: string
          invited_by?: string
          kitchen_id?: string
          role?: Database["public"]["Enums"]["kitchen_member_role"]
          status?: Database["public"]["Enums"]["kitchen_invite_status"]
        }
        Relationships: []
      }
      kitchen_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          kitchen_id: string
          role: Database["public"]["Enums"]["kitchen_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          kitchen_id: string
          role?: Database["public"]["Enums"]["kitchen_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          kitchen_id?: string
          role?: Database["public"]["Enums"]["kitchen_member_role"]
          user_id?: string
        }
        Relationships: []
      }
      kitchen_grocery_items: {
        Row: {
          added_by: string | null
          category: string | null
          checked: boolean
          created_at: string
          grocery_list_id: string
          id: string
          name: string
          quantity: string
          section: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          category?: string | null
          checked?: boolean
          created_at?: string
          grocery_list_id: string
          id?: string
          name: string
          quantity?: string
          section?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          category?: string | null
          checked?: boolean
          created_at?: string
          grocery_list_id?: string
          id?: string
          name?: string
          quantity?: string
          section?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      kitchen_grocery_lists: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          kitchen_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          kitchen_id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          kitchen_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kitchen_meal_plan_items: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number
          id: string
          meal_plan_id: string
          meal_type: string
          recipe_data: Json | null
          recipe_id: string | null
          servings: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week: number
          id?: string
          meal_plan_id: string
          meal_type?: string
          recipe_data?: Json | null
          recipe_id?: string | null
          servings?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          id?: string
          meal_plan_id?: string
          meal_type?: string
          recipe_data?: Json | null
          recipe_id?: string | null
          servings?: number
          sort_order?: number
        }
        Relationships: []
      }
      kitchen_meal_plans: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kitchen_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kitchen_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kitchen_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      kitchen_recipe_shares: {
        Row: {
          created_at: string
          id: string
          kitchen_id: string
          recipe_id: string
          shared_by_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kitchen_id: string
          recipe_id: string
          shared_by_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kitchen_id?: string
          recipe_id?: string
          shared_by_user_id?: string
        }
        Relationships: []
      }
      kitchens: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cooked_meals: {
        Row: {
          cooked_at: string
          estimated_savings: number | null
          id: string
          metadata: Json | null
          recipe_id: string
          recipe_name: string
          savings_source: string
          user_id: string
        }
        Insert: {
          cooked_at?: string
          estimated_savings?: number | null
          id?: string
          metadata?: Json | null
          recipe_id: string
          recipe_name: string
          savings_source?: string
          user_id: string
        }
        Update: {
          cooked_at?: string
          estimated_savings?: number | null
          id?: string
          metadata?: Json | null
          recipe_id?: string
          recipe_name?: string
          savings_source?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plan_items: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          meal_plan_id: string
          meal_type: string
          recipe_data: Json | null
          recipe_id: string
          servings: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          meal_plan_id: string
          meal_type?: string
          recipe_data?: Json | null
          recipe_id: string
          servings?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          meal_plan_id?: string
          meal_type?: string
          recipe_data?: Json | null
          recipe_id?: string
          servings?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_servings: number
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_servings?: number
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_servings?: number
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          cook_time: string
          created_at: string
          created_by: string | null
          chef: string | null
          cuisine: string | null
          difficulty: string
          id: string
          image: string
          ingredients: string[]
          instructions: string[]
          is_public: boolean
          name: string
          raw_api_payload: Json | null
          servings: number
          source: string | null
          source_url: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          cook_time?: string
          created_at?: string
          created_by?: string | null
          chef?: string | null
          cuisine?: string | null
          difficulty?: string
          id?: string
          image?: string
          ingredients?: string[]
          instructions?: string[]
          is_public?: boolean
          name: string
          raw_api_payload?: Json | null
          servings?: number
          source?: string | null
          source_url?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          cook_time?: string
          created_at?: string
          created_by?: string | null
          chef?: string | null
          cuisine?: string | null
          difficulty?: string
          id?: string
          image?: string
          ingredients?: string[]
          instructions?: string[]
          is_public?: boolean
          name?: string
          raw_api_payload?: Json | null
          servings?: number
          source?: string | null
          source_url?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      kitchen_invite_status: "accepted" | "expired" | "pending" | "revoked"
      kitchen_member_role: "editor" | "owner" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
