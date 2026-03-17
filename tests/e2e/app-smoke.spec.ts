import { expect, test, type Page } from "@playwright/test";

const BROWSE_FEED_CACHE_KEY = "munch:browse-feed-cache:v2";
const STORE_KEY = "chefstack-storage";

const demoRecipe = {
  id: "demo-suggested-recipe",
  name: "Skillet Lemon Eggs",
  image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=1200&q=80",
  cook_time: "15 min",
  difficulty: "Easy",
  ingredients: ["2 eggs", "1 tbsp butter", "1 tsp lemon zest", "1 pinch salt"],
  tags: ["Quick", "Breakfast"],
  instructions: [
    "Melt the butter in a nonstick skillet over medium heat.",
    "Crack in the eggs and season with salt.",
    "Finish with lemon zest and serve warm.",
  ],
  cuisine: "American",
  source: "community-seed",
  chef: "Munch",
  servings: 2,
};

const persistedStore = {
  state: {
    storeOwnerUserId: null,
    userProfile: {
      dietaryRestrictions: [],
      skillLevel: "",
      flavorProfiles: [],
      cuisinePreferences: [],
      groceryLocation: "",
      groceryCurrency: "USD",
    },
    pantryList: [
      { id: "eggs", name: "eggs", quantity: "12" },
      { id: "butter", name: "butter", quantity: "1" },
    ],
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
    kitchenViewMode: "solo",
    displayName: "Chef",
    onboardingComplete: true,
    isGuest: true,
    tutorialComplete: true,
    showTutorial: false,
    cookingStreak: 0,
    lastCookedDate: null,
    totalMealsCooked: 0,
    cookedRecipeIds: [],
    totalXp: 0,
    earnedBadges: [],
    archiveBehavior: "ask",
    chefAvatarUrl: null,
    shareCustomRecipesByDefault: true,
    recipeRatings: {},
    recipeCookCounts: {},
    cookModeTtsEnabled: true,
    activeKitchen: null,
  },
  version: 0,
};

async function seedAppState(
  page: Page,
  {
    browseFeed = [],
    store = null,
  }: {
    browseFeed?: unknown[];
    store?: Record<string, unknown> | null;
  } = {},
) {
  await page.addInitScript(
    ({ browseFeed, browseFeedKey, store, storeKey }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(browseFeedKey, JSON.stringify(browseFeed));
      window.sessionStorage.setItem(browseFeedKey, JSON.stringify(browseFeed));
      if (store) {
        window.localStorage.setItem(storeKey, JSON.stringify(store));
      }
    },
    {
      browseFeed,
      browseFeedKey: BROWSE_FEED_CACHE_KEY,
      store,
      storeKey: STORE_KEY,
    },
  );
}

test("desktop home keeps the marketing landing page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop-only assertion");

  await seedAppState(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Munch helps people turn ingredients/i })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  await page.screenshot({ path: "tmp/playwright-home-desktop.png", fullPage: true });
});

test("mobile home stays on the landing page for unauthenticated web visitors", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "mobile-only assertion");

  await seedAppState(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Munch helps people turn ingredients/i })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  await page.screenshot({ path: "tmp/playwright-home-mobile.png", fullPage: true });
});

test("dashboard suggested recipe preview shows ingredients as a vertical list", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop-only assertion");

  await seedAppState(page, { browseFeed: [demoRecipe], store: persistedStore });
  await page.goto("/dashboard");

  await expect(page.getByText("Suggested for you")).toBeVisible();
  await page.getByText("Skillet Lemon Eggs").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("p").filter({ hasText: /^Ingredients$/ })).toBeVisible();
  await expect(dialog.locator("ul li")).toHaveText(["2 eggs", "1 tbsp butter", "1 tsp lemon zest", "1 pinch salt"]);

  await page.screenshot({ path: "tmp/playwright-dashboard-preview.png", fullPage: true });
});
