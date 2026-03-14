import { ShoppingCart, Package } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Pantry from "@/pages/Pantry";
import GroceryList from "@/pages/GroceryList";
import { useIsMobile } from "@/hooks/use-mobile";

type GroceryView = "pantry" | "grocery";

export default function Groceries() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") === "grocery" ? "grocery" : "pantry";
  const currentMeta = currentView === "grocery"
    ? {
        title: "Groceries",
        subtitle: "Build, export, and shop your list without losing your place.",
        badge: "Grocery List",
      }
    : {
        title: "Groceries",
        subtitle: "Keep pantry staples organized and turn them into meals.",
        badge: "Pantry",
      };

  if (!isMobile) {
    return currentView === "grocery" ? <GroceryList /> : <Pantry />;
  }

  const setView = (view: GroceryView) => {
    setSearchParams(view === "grocery" ? { view: "grocery" } : {});
  };

  return (
    <div className="min-h-full bg-[#FFFAF5] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-orange-100/80 bg-[#FFFAF5]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 pt-3 pb-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">
                Kitchen hub
              </p>
              <h1
                className="text-xl font-bold leading-tight text-stone-900"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {currentMeta.title}
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                {currentMeta.subtitle}
              </p>
            </div>
            <div className="shrink-0 rounded-full border border-orange-100 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 shadow-sm">
              {currentMeta.badge}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/90 p-1 shadow-sm border border-orange-100">
            <button
              onClick={() => setView("pantry")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                currentView === "pantry"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-stone-500"
              }`}
            >
              <Package size={16} /> Pantry
            </button>
            <button
              onClick={() => setView("grocery")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                currentView === "grocery"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-stone-500"
              }`}
            >
              <ShoppingCart size={16} /> Grocery List
            </button>
          </div>
        </div>
      </div>

      {currentView === "grocery" ? <GroceryList embedded /> : <Pantry embedded />}
    </div>
  );
}
