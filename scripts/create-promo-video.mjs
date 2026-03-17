import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE_URL = process.env.MUNCH_PROMO_BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("tmp/promo-video-raw");
const BROWSE_FEED_CACHE_KEY = "munch:browse-feed-cache:v2";
const STORE_KEY = "chefstack-storage";

function recipeCover(title, start, end, accent) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="720" height="1280" rx="44" fill="url(#bg)" />
      <circle cx="560" cy="180" r="140" fill="#ffffff" fill-opacity="0.34" />
      <circle cx="154" cy="1110" r="96" fill="#ffffff" fill-opacity="0.32" />
      <rect x="56" y="72" width="194" height="44" rx="22" fill="#ffffff" fill-opacity="0.84" />
      <text x="153" y="101" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="${accent}">Munch Demo</text>
      <text x="56" y="858" font-family="Georgia, serif" font-size="58" font-weight="700" fill="#1f2937">${title}</text>
      <rect x="56" y="916" width="280" height="8" rx="4" fill="${accent}" fill-opacity="0.26" />
      <text x="56" y="968" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="${accent}">Cook smarter with what you have</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const recipes = [
  {
    id: "demo-suggested-recipe",
    name: "Skillet Lemon Eggs",
    image: recipeCover("Skillet Lemon Eggs", "#fff7ed", "#fdba74", "#ea580c"),
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
  },
  {
    id: "demo-swipe-recipe",
    name: "Crispy Chili Tofu Bowl",
    image: recipeCover("Crispy Chili Tofu", "#ecfdf5", "#6ee7b7", "#047857"),
    cook_time: "25 min",
    difficulty: "Intermediate",
    ingredients: ["1 block tofu", "2 tbsp chili crisp", "1 cup rice", "2 green onions"],
    tags: ["High Protein", "Dinner"],
    instructions: [
      "Bake tofu until crisp around the edges.",
      "Warm rice and spoon into bowls.",
      "Top with tofu, chili crisp, and sliced green onions.",
    ],
    cuisine: "Asian",
    source: "community-seed",
    chef: "Munch",
    servings: 2,
  },
  {
    id: "demo-pantry-recipe",
    name: "Roasted Tomato Pasta",
    image: recipeCover("Roasted Tomato Pasta", "#eff6ff", "#93c5fd", "#1d4ed8"),
    cook_time: "30 min",
    difficulty: "Easy",
    ingredients: ["8 oz pasta", "2 cups cherry tomatoes", "2 garlic cloves", "2 tbsp olive oil"],
    tags: ["Pasta", "Weeknight"],
    instructions: [
      "Roast the tomatoes and garlic until softened.",
      "Boil pasta until al dente.",
      "Toss everything together with olive oil and salt.",
    ],
    cuisine: "Italian",
    source: "community-seed",
    chef: "Munch",
    servings: 4,
  },
];

const store = {
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
      { id: "tofu", name: "tofu", quantity: "2 blocks" },
      { id: "rice", name: "rice", quantity: "1 bag" },
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
    displayName: "Chef Demo",
    onboardingComplete: true,
    isGuest: true,
    tutorialComplete: true,
    showTutorial: false,
    cookingStreak: 4,
    lastCookedDate: null,
    totalMealsCooked: 12,
    cookedRecipeIds: [],
    totalXp: 320,
    earnedBadges: [],
    archiveBehavior: "ask",
    chefAvatarUrl: null,
    shareCustomRecipesByDefault: true,
    recipeRatings: {},
    recipeCookCounts: {},
    cookModeTtsEnabled: false,
    activeKitchen: null,
  },
  version: 0,
};

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.resolve("public/media"), { recursive: true });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const device = devices["Pixel 7"];
  const context = await browser.newContext({
    ...device,
    baseURL: BASE_URL,
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 430, height: 932 },
    },
    viewport: { width: 430, height: 932 },
  });

  await context.addInitScript(
    ({ browseFeed, browseFeedKey, persistedStore, storeKey }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(browseFeedKey, JSON.stringify(browseFeed));
      window.sessionStorage.setItem(browseFeedKey, JSON.stringify(browseFeed));
      window.localStorage.setItem(storeKey, JSON.stringify(persistedStore));
    },
    {
      browseFeed: recipes,
      browseFeedKey: BROWSE_FEED_CACHE_KEY,
      persistedStore: store,
      storeKey: STORE_KEY,
    },
  );

  const page = await context.newPage();
  const recordedVideo = page.video();

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await wait(1600);

  await page.getByText("Skillet Lemon Eggs").first().click();
  await wait(1800);
  await page.keyboard.press("Escape");
  await wait(700);

  await page.goto("/swipe", { waitUntil: "domcontentloaded" });
  await wait(1700);
  await page.locator('[data-tutorial="like-button"]').click();
  await wait(1500);

  await page.goto("/saved", { waitUntil: "domcontentloaded" });
  await wait(1800);
  await page.getByText("Crispy Chili Tofu Bowl").first().click();
  await wait(1700);
  await page.keyboard.press("Escape");
  await wait(700);

  await page.goto("/pantry", { waitUntil: "domcontentloaded" });
  await wait(2200);

  await page.screenshot({ path: path.resolve("public/media/munch-demo-poster.jpg") });

  await context.close();
  await browser.close();
  const sourcePath = await recordedVideo.path();
  const targetPath = path.resolve("tmp/munch-demo-recording.webm");
  await fs.copyFile(sourcePath, targetPath);
  console.log(targetPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
