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
const margin = 42;
const gutter = 20;
const colWidth = (pageWidth - margin * 2 - gutter) / 2;
const leftX = margin;
const rightX = margin + colWidth + gutter;
const contentBottom = pageHeight - 42;

const palette = {
  ink: [38, 38, 38],
  sub: [92, 92, 92],
  accent: [222, 122, 30],
  accentSoft: [252, 243, 232],
  line: [226, 226, 226],
};

let leftY = margin + 58;
let rightY = margin + 58;

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
  doc.setFontSize(9);
  for (const line of bodyLines) {
    if (line.type === "paragraph") {
      const lines = wrap(line.text, width, 9);
      doc.text(lines, x, y);
      y += lines.length * 11 + 4;
      continue;
    }
    if (line.type === "bullet") {
      const bulletWidth = width - 12;
      const lines = wrap(line.text, bulletWidth, 9);
      doc.circle(x + 3, y - 3, 1.5, "F");
      doc.text(lines, x + 10, y);
      y += lines.length * 11 + 2;
    }
  }
  return y + 2;
}

function addSection(column, title, lines) {
  if (column === "left") {
    leftY = drawSection(leftX, leftY, colWidth, title, lines);
  } else {
    rightY = drawSection(rightX, rightY, colWidth, title, lines);
  }
}

setFill(palette.accentSoft);
doc.roundedRect(margin, margin, pageWidth - margin * 2, 46, 10, 10, "F");
setText(palette.accent);
doc.setFont("helvetica", "bold");
doc.setFontSize(22);
doc.text("Munch", margin + 16, margin + 29);
setText(palette.sub);
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.text("One-page repo summary", margin + 16, margin + 41);

setText(palette.sub);
doc.setFont("helvetica", "italic");
doc.setFontSize(8);
doc.text("Architecture overview is based only on repository evidence.", pageWidth - margin - 220, margin + 41);

addSection("left", "What It Is", [
  {
    type: "paragraph",
    text: "Munch is a cooking app that combines pantry tracking, recipe discovery, meal planning, grocery prep, and guided cook mode in one React + Supabase product.",
  },
  {
    type: "paragraph",
    text: "It uses AI-backed edge functions for recipe import, fridge scanning, nutrition estimates, recipe tweaks, and meal-plan generation.",
  },
]);

addSection("left", "Who It's For", [
  {
    type: "paragraph",
    text: "Primary persona: a home cook who wants to decide what to make from available ingredients, save/import recipes, and move from planning to cooking without switching apps.",
  },
]);

addSection("left", "What It Does", [
  { type: "bullet", text: "Tracks pantry items with category and quantity hints; includes a fridge-scan entry point." },
  { type: "bullet", text: "Browses recipes in a swipe feed with pantry-match scoring, filters, and save/pass actions." },
  { type: "bullet", text: "Imports recipes from URL, PDF, or photo; users can review/edit before saving." },
  { type: "bullet", text: "Saves recipes into folders/cookbooks, adds tags, edits ingredients, and caches nutrition results." },
  { type: "bullet", text: "Builds weekly meal plans, supports drag-and-drop scheduling, and can generate plans from saved recipes." },
  { type: "bullet", text: "Creates grocery lists manually or from meal plans, grouped by store category." },
  { type: "bullet", text: "Runs step-by-step cook mode with timers, text-to-speech, voice commands, glossary popovers, and XP/progress." },
]);

addSection("right", "How It Works", [
  {
    type: "bullet",
    text: "Client: Vite + React + TypeScript app with `react-router-dom`, `@tanstack/react-query`, Tailwind/shadcn UI, and Zustand persisted local state.",
  },
  {
    type: "bullet",
    text: "Auth/data: Supabase client handles auth and browser session persistence; Postgres tables include `profiles`, `recipes`, `meal_plans`, and `meal_plan_items` with RLS.",
  },
  {
    type: "bullet",
    text: "Recipe flow: browse feed calls the `search-recipes` edge function, which merges public DB recipes with external MealDB results before ranking in the client.",
  },
  {
    type: "bullet",
    text: "AI services: edge functions call Lovable AI Gateway for import parsing, fridge image detection, meal-plan generation, nutrition analysis, and recipe tweaks.",
  },
  {
    type: "bullet",
    text: "Data flow: user signs in -> onboarding writes profile defaults -> client reads/writes Supabase + local store -> edge functions enrich recipe/meal data -> UI pages consume normalized recipe objects.",
  },
]);

addSection("right", "How To Run", [
  { type: "bullet", text: "Install Node.js, then run `npm i`." },
  { type: "bullet", text: "Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the web app." },
  { type: "bullet", text: "Start locally with `npm run dev`." },
  { type: "bullet", text: "For AI edge features, `LOVABLE_API_KEY` is required in Supabase functions." },
]);

addSection("right", "Differentiator", [
  {
    type: "paragraph",
    text: "Compared with standalone pantry trackers, recipe savers, or meal planners, Munch is differentiated by chaining pantry-aware discovery, AI recipe ingestion, meal planning, grocery prep, and guided cook mode inside one workflow.",
  },
]);

const footerTop = contentBottom - 88;
setDraw(palette.line);
doc.setLineWidth(1);
doc.line(margin, footerTop, pageWidth - margin, footerTop);

setText(palette.accent);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("Improve Next", margin, footerTop + 18);

setText(palette.ink);
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
const improve1 = wrap("Persist grocery items in Supabase: the current grocery page initializes from local store state and does not show a dedicated DB table in the repo.", pageWidth - margin * 2 - 18, 9);
doc.circle(margin + 3, footerTop + 29, 1.5, "F");
doc.text(improve1, margin + 10, footerTop + 32);
const improve2 = wrap("Add clearer setup docs (`.env` example, Supabase function deployment, local DB/bootstrap). The repo shows required env variables in code, but a complete local setup guide is not found in the repo.", pageWidth - margin * 2 - 18, 9);
doc.circle(margin + 3, footerTop + 53, 1.5, "F");
doc.text(improve2, margin + 10, footerTop + 56);

setText(palette.sub);
doc.setFont("helvetica", "normal");
doc.setFontSize(7.5);
doc.text(
  "Evidence: README.md, package.json, src/App.tsx, src/lib/store.ts, src/hooks/useBrowseFeed.ts, src/hooks/useDbRecipes.ts, src/pages/*, supabase/functions/*, supabase/migrations/*",
  margin,
  pageHeight - 18
);

if (leftY > footerTop - 8 || rightY > footerTop - 8) {
  throw new Error(`Content overflowed the one-page layout (leftY=${leftY}, rightY=${rightY}, footerTop=${footerTop})`);
}

doc.save(outputPath);
console.log(outputPath);
