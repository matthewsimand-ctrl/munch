import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";

const outputDir = path.resolve("output/pdf");
const outputPath = path.join(outputDir, "munch-app-summary.pdf");

fs.mkdirSync(outputDir, { recursive: true });

const doc = new jsPDF({
  orientation: "portrait",
  unit: "pt",
  format: "letter",
  compress: true,
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 40;
const gutter = 20;
const colWidth = (pageWidth - margin * 2 - gutter) / 2;
const leftX = margin;
const rightX = margin + colWidth + gutter;
const footerY = pageHeight - 20;
const footerRuleY = pageHeight - 34;

const palette = {
  ink: [38, 38, 38],
  sub: [96, 96, 96],
  accent: [222, 122, 30],
  accentSoft: [252, 243, 232],
  line: [226, 226, 226],
};

let leftY = margin + 56;
let rightY = margin + 56;

function setFill(rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setText(rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function wrap(text, width, fontSize) {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, width);
}

function drawSection(x, y, width, title, bodyLines) {
  setText(palette.accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), x, y);
  y += 14;

  setText(palette.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  for (const line of bodyLines) {
    if (line.type === "paragraph") {
      const lines = wrap(line.text, width, 8.5);
      doc.text(lines, x, y);
      y += lines.length * 10 + 4;
      continue;
    }

    if (line.type === "bullet") {
      const lines = wrap(line.text, width - 12, 8.5);
      doc.circle(x + 3, y - 3, 1.4, "F");
      doc.text(lines, x + 10, y);
      y += lines.length * 10 + 2;
    }
  }

  return y + 4;
}

function addSection(column, title, lines) {
  if (column === "left") {
    leftY = drawSection(leftX, leftY, colWidth, title, lines);
  } else {
    rightY = drawSection(rightX, rightY, colWidth, title, lines);
  }
}

setFill(palette.accentSoft);
doc.roundedRect(margin, margin, pageWidth - margin * 2, 44, 10, 10, "F");

setText(palette.accent);
doc.setFont("helvetica", "bold");
doc.setFontSize(21);
doc.text("Munch", margin + 16, margin + 28);

setText(palette.sub);
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.text("One-page app summary from repo evidence", margin + 16, margin + 40);

setText(palette.sub);
doc.setFont("helvetica", "italic");
doc.setFontSize(7.5);
doc.text("Architecture and setup notes below are based only on files in this repository.", pageWidth - margin - 230, margin + 40);

addSection("left", "What It Is", [
  {
    type: "paragraph",
    text: "Munch is a cooking app that brings pantry tracking, recipe discovery, meal planning, grocery prep, and guided cooking into a single React application.",
  },
  {
    type: "paragraph",
    text: "Repo evidence also shows AI-backed Supabase edge functions for recipe import, pantry photo scanning, meal-plan generation, recipe tweaks, and nutrition analysis.",
  },
]);

addSection("left", "Who It's For", [
  {
    type: "paragraph",
    text: "Primary persona: a home cook who wants fast meal ideas from available ingredients, a place to save recipes, and a smoother path from planning to cooking.",
  },
]);

addSection("left", "What It Does", [
  { type: "bullet", text: "Tracks pantry items with quantities and categories; pantry page includes camera and receipt upload flows." },
  { type: "bullet", text: "Shows a swipe-style browse feed with pantry-match logic, saved/disliked states, and recipe search." },
  { type: "bullet", text: "Imports recipes from URLs, PDFs, or images, then normalizes ingredients and instructions before saving." },
  { type: "bullet", text: "Stores recipes, folders/cookbooks, tags, ingredient overrides, ratings, and cached nutrition data." },
  { type: "bullet", text: "Builds weekly meal plans, supports drag-and-drop scheduling, and can generate plans from saved recipes." },
  { type: "bullet", text: "Creates grocery lists for solo use or shared kitchens, grouped into store-style sections." },
  { type: "bullet", text: "Runs cook mode with timers, text-to-speech, voice commands, glossary help, and cooked-meal progress tracking." },
]);

addSection("right", "How It Works", [
  { type: "bullet", text: "Client: Vite + React + TypeScript app with route-based pages in `src/pages`, UI components in `src/components`, React Query for async data, and Zustand persisted local state in `src/lib/store.ts`." },
  { type: "bullet", text: "Auth and app data: `src/integrations/supabase/client.ts` creates the browser Supabase client with session persistence. Migrations define tables including `profiles`, `recipes`, `recipe_api_cache`, `cooked_meals`, `app_notifications`, and kitchen collaboration tables." },
  { type: "bullet", text: "Recipe flow: the client reads public recipes from Supabase, and `useBrowseFeed` invokes the `search-recipes` edge function, which fetches public DB recipes plus cached/external recipe sources before the client ranks results." },
  { type: "bullet", text: "AI services: Supabase edge functions call the Lovable AI Gateway for recipe import, fridge scanning, meal-plan generation, recipe tweaks, grocery price estimation, and nutrition analysis." },
  { type: "bullet", text: "Data flow: user authenticates or enters guest mode -> onboarding writes profile fields -> pages read/write local store and Supabase tables -> edge functions enrich recipe and planning data -> UI renders normalized recipe objects." },
]);

addSection("right", "How To Run", [
  { type: "bullet", text: "Install dependencies: `npm i`." },
  { type: "bullet", text: "Set web env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`." },
  { type: "bullet", text: "Start the app: `npm run dev`." },
  { type: "bullet", text: "If you want AI-backed Supabase functions, repo code shows they expect `LOVABLE_API_KEY`; some functions also reference `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`." },
  { type: "bullet", text: "Complete local Supabase bootstrap/deploy instructions: Not found in repo." },
]);

setDraw(palette.line);
doc.setLineWidth(1);
doc.line(margin, footerRuleY, pageWidth - margin, footerRuleY);

setText(palette.sub);
doc.setFont("helvetica", "normal");
doc.setFontSize(7.2);
doc.text(
  "Evidence: README.md, package.json, src/App.tsx, src/lib/store.ts, src/hooks/useBrowseFeed.ts, src/hooks/useDbRecipes.ts, src/hooks/useKitchen*.ts, src/pages/*.tsx, src/integrations/supabase/client.ts, supabase/functions/*, supabase/migrations/*",
  margin,
  footerY
);

if (leftY > footerRuleY - 8 || rightY > footerRuleY - 8) {
  throw new Error(`Content overflowed the one-page layout (leftY=${leftY}, rightY=${rightY}, footerRuleY=${footerRuleY})`);
}

doc.save(outputPath);
console.log(outputPath);
