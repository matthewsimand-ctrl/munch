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
