

# ChefStack — Tinder-Style Recipe Discovery App

## Overview
A mobile-first "swipe to discover recipes" app powered by a pantry-first matching algorithm. Users build a taste profile, manage their pantry, then swipe through recipes ranked by ingredient match percentage.

## Pages & Flow

### 1. Onboarding — Taste Profile (3 steps)
- **Step 1**: Dietary Restrictions (multi-select chips: Vegetarian, Vegan, Gluten-Free, Dairy-Free, Nut-Free, None)
- **Step 2**: Skill Level (single select: Beginner, Intermediate, Advanced)
- **Step 3**: Flavor Profiles (multi-select chips: Spicy, Sweet, Savory, Umami, Fresh/Citrusy)
- Progress bar at top, animated transitions between steps

### 2. Pantry Manager
- Text input to add ingredients manually with "Add" button
- Ingredient chips with remove (×) buttons
- "Premium" photo upload section with a styled FileUploader and a lock/badge UI — wired to Lovable AI (Gemini) to parse fridge photos into ingredient lists
- Pantry persisted via Zustand

### 3. Swipe Engine (Home)
- Tinder-style card stack using framer-motion drag gestures
- Each card shows: recipe image, name, cook time, difficulty, match % badge, and missing ingredients list
- Swipe right = save to liked recipes, swipe left = discard
- Color-coded match borders: green (100%), yellow (1-2 missing), gray (3+)
- Like/Dislike buttons below the card for tap interaction

### 4. Saved Recipes
- Grid/list of liked recipes with match scores
- Tap to view full recipe detail (ingredients list with owned/missing highlights, instructions)

## Core Logic

### Fuzzy Ingredient Matching (`MatchLogic.ts`)
- Normalize: lowercase, strip plurals, trim whitespace
- Substring/token matching: "chicken" matches "chicken breast", "chicken thighs"
- Returns: match percentage, list of matched ingredients, list of missing ingredients

### State Management (Zustand + persist)
- `userProfile`: dietary restrictions, skill level, flavor preferences
- `pantryList`: array of ingredient strings
- `likedRecipes`: array of saved recipe IDs
- `onboardingComplete`: boolean flag

### Mock Data
- `recipes.json` with 5+ recipes, each containing: id, name, image, cookTime, difficulty, ingredients array, tags, instructions

## Design
- Warm neutrals palette (cream backgrounds, warm browns, terracotta accents)
- Mobile-first layout (max-width container centered on desktop)
- High-quality food imagery via placeholder URLs
- Smooth framer-motion animations for card swipes and page transitions

## Tech Additions
- **framer-motion** for swipe gestures and animations
- **zustand** for state management with localStorage persistence

