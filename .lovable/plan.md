

# Plan: Fix Recipe Details, Import Flow, and Saved Tab Issues

## Problem Analysis

After reading the code, I can see the **actual current state**:

1. **Swipe.tsx (Recipes tab)** - The recipe detail dialog at line 527 **does** have instructions code, but it's likely that recipes from the external APIs have instructions that are empty arrays or the dialog isn't rendering properly. The dialog also **lacks**: NutritionCard, "Add missing to grocery", and "Start Cooking" button.

2. **SavedRecipes.tsx (Saved tab)** - The recipe detail dialog at line 583 **does** have instructions, NutritionCard (line 601), grocery integration (line 571), and Start Cooking (line 609). So the Saved tab dialog is actually complete. The issue may be that `selectedRecipe` objects from `savedApiRecipes` don't have instructions populated.

3. **ImportRecipeDialog** - Already functional with URL/PDF/paste. But missing: review/edit step before save, and "Make Discoverable" toggle.

4. **Tag reset on "All Recipes"** - Already handled at line 221: `setActiveTag("All")`. This should work.

**Root cause for missing instructions**: When recipes are saved via `likeRecipe` from Swipe, the `savedApiRecipes` store saves the recipe data. But the `instructions` field from the external API recipes may not be getting stored correctly, OR the recipes from `useBrowseFeed` may have instructions stripped. Looking at the search-recipes edge function, instructions ARE being returned (e.g., `instructions.slice(0, 10)`). The `Swipe.tsx` code checks `selectedRecipe.instructions.length > 0` which should work.

The real issue is likely that when the user clicks "View Recipe" in SavedRecipes, the recipe is loaded from `savedApiRecipes` which stores whatever was passed to `likeRecipe`. In Swipe.tsx line 99, `likeRecipe(currentRecipe.id, currentRecipe)` passes the full recipe object including instructions. So instructions should be there.

Let me re-examine: The Swipe dialog IS showing instructions (line 528-541). The Saved dialog IS showing instructions (line 584-596). The user says they're not showing — this suggests the recipe objects themselves have empty `instructions` arrays. This could happen if:
- DB recipes (`useDbRecipes`) return recipes where `instructions` is `'{}'::text[]` (empty default)
- Saved API recipes were saved before instructions were included

Since both dialogs have the code, the fix needs to ensure data integrity AND add the missing features to the Swipe dialog.

## Changes Required

### 1. Swipe.tsx — Add missing features to recipe detail dialog
The Swipe dialog currently shows: image, meta, tags, ingredients, instructions. **Missing**: NutritionCard, "Add missing to grocery" button, "Start Cooking" button.

- Import `NutritionCard` component
- Import `addCustomGroceryItem` and `pantryList` (already available)
- Add NutritionCard after instructions section
- Add "Add missing items to grocery" button in ingredients section
- Add "Start Cooking" button at the bottom
- Add `useNavigate` usage for cook mode navigation

### 2. ImportRecipeDialog — Add review/edit step and discoverable toggle
After AI extraction, show a review form with editable fields before saving:
- Recipe name, ingredients list, instructions list, cook time, difficulty, cuisine, tags
- "Make Discoverable" toggle checkbox
- When discoverable is ON, save to Supabase `recipes` table with `is_public: true` and `created_by: auth.uid()`
- When discoverable is OFF, just save locally via `likeRecipe`

This requires:
- New state: `reviewMode`, `reviewData`, `isDiscoverable`
- After successful AI extraction, populate review form instead of immediately saving
- Confirm button that either saves to DB (if discoverable) or locally (if not)

### 3. SavedRecipes.tsx — Minor fixes
- Verify instructions display is working (code already present)
- The dialog already has NutritionCard, grocery add, and Start Cooking — these should work
- Ensure "All Recipes" click resets tag filter (code already present at line 221)

### 4. Data issue — Instructions not appearing
The most likely issue: recipes saved from the swipe feed DO have instructions in the data, but when rendered, the dialog might not be scrollable enough to see them. OR some recipes genuinely have empty instructions arrays.

Add a fallback message when instructions are empty: "No instructions available for this recipe."

## Files to Edit

1. **`src/pages/Swipe.tsx`** — Add NutritionCard, grocery integration, and Start Cooking to recipe detail dialog (~30 lines added)

2. **`src/components/ImportRecipeDialog.tsx`** — Major overhaul to add review/edit step with discoverable toggle (~150 lines added/modified). After extraction, show editable form. Add Supabase insert for discoverable recipes.

3. **`src/pages/SavedRecipes.tsx`** — Add fallback text when instructions are empty. Verify all features render.

4. **`src/pages/Swipe.tsx`** — Add fallback text when instructions are empty.

## Technical Details

- ImportRecipeDialog review form: After AI returns recipe JSON, set `reviewData` state and switch to review mode. Show Input fields for name/cook_time/difficulty/cuisine, editable ingredient/instruction lists with add/remove, tag badges, and a Switch for "Make Discoverable".
- When "Make Discoverable" is ON and user confirms, insert into `recipes` table via Supabase client with `created_by: (await supabase.auth.getUser()).data.user?.id`. Also save locally via `likeRecipe`.
- When OFF, just save via `likeRecipe` as currently done.
- No database migrations needed — the `recipes` table already has the right schema with `is_public`, `created_by`, `instructions`, etc.

