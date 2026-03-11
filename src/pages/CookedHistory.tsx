import { useMemo, useState } from "react";
import { Sparkles, RefreshCw, Utensils, ChevronRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCookedMeals } from "@/hooks/useCookedMeals";
import { toast } from "sonner";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";

function formatCookedAt(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function CookedHistory() {
  const navigate = useNavigate();
  const { meals, loading, estimateMealSavings, loadMeals } = useCookedMeals(60);
  const { isPremium } = usePremiumAccess();
  const [estimatingMealId, setEstimatingMealId] = useState<string | null>(null);
  const [showSavings, setShowSavings] = useState(false);

  const totals = useMemo(() => {
    const estimatedMeals = meals.filter((meal) => meal.estimated_savings != null);
    const savedTotal = estimatedMeals.reduce((sum, meal) => sum + (meal.estimated_savings ?? 0), 0);
    return {
      cooked: meals.length,
      estimatedCount: estimatedMeals.length,
      estimatedTotal: Number(savedTotal.toFixed(2)),
    };
  }, [meals]);

  const groupedMeals = useMemo(() => {
    const groups = new Map<string, typeof meals[0] & { count: number; ids: string[]; total_savings: number }>();

    meals.forEach(meal => {
      // Group by recipe name to coalesce duplicates
      const key = meal.recipe_name.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          ...meal,
          count: 1,
          ids: [meal.id],
          total_savings: meal.estimated_savings || 0
        });
      } else {
        const existing = groups.get(key)!;
        existing.count += 1;
        existing.ids.push(meal.id);

        // Accumulate savings
        if (meal.estimated_savings) {
          existing.total_savings += meal.estimated_savings;
          // Ensure we consider this grouped meal as "estimated" if it has ANY savings
          existing.estimated_savings = existing.total_savings;
        }

        // Keep the most recent cooked_at date
        if (new Date(meal.cooked_at) > new Date(existing.cooked_at)) {
          existing.cooked_at = meal.cooked_at;
          existing.id = meal.id; // use the ID of the most recent one for interactions
        }
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      new Date(b.cooked_at).getTime() - new Date(a.cooked_at).getTime()
    );
  }, [meals]);

  const handleEstimateSavings = async (mealId: string) => {
    if (!isPremium) {
      toast.info("Estimated savings is a Premium feature.", {
        action: {
          label: "Open Settings",
          onClick: () => navigate("/settings"),
        },
      });
      return;
    }
    const meal = meals.find((item) => item.id === mealId);
    if (!meal) return;

    setEstimatingMealId(mealId);
    const updated = await estimateMealSavings(meal);
    setEstimatingMealId(null);

    if (updated?.estimated_savings != null) {
      toast.success(`AI estimate: about $${updated.estimated_savings.toFixed(2)} saved`);
    } else {
      toast.error("Couldn't estimate this one yet. Please try again.");
    }
  };

  const handleRefresh = async () => {
    await loadMeals();
    toast.success("Cooked history refreshed");
  };

  return (
    <div className="min-h-full px-4 md:px-8 py-6 md:py-8" style={{ background: "#FFFAF5" }}>
      <div className="max-w-5xl mx-auto space-y-5">
        <section className="rounded-2xl border p-5 md:p-6" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Your progress</p>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mt-1">Cooked History</h1>
              <p className="text-sm text-stone-500 mt-1">Every completed meal in one place.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!isPremium) {
                    toast.info("Estimated savings is a Premium feature.", {
                      action: {
                        label: "Open Settings",
                        onClick: () => navigate("/settings"),
                      },
                    });
                    return;
                  }
                  setShowSavings((prev) => !prev);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-xl border border-violet-100"
              >
                <Sparkles size={13} /> Estimated savings {!isPremium && <><Lock size={12} /> Premium</>}
              </button>
              <button
                onClick={handleRefresh}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-xl border border-orange-100"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
            <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-3">
              <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wide">Meals cooked</p>
              <p className="text-xl font-bold text-stone-800 mt-1">{totals.cooked}</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-3">
              <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wide">Estimates added</p>
              <p className="text-xl font-bold text-stone-800 mt-1">{totals.estimatedCount}</p>
            </div>
            {showSavings && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3">
                <p className="text-[11px] text-emerald-700/75 font-semibold uppercase tracking-wide">Estimated savings</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {isPremium ? `≈ $${totals.estimatedTotal.toFixed(2)}` : "Premium feature"}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
          {loading ? (
            <p className="text-sm text-stone-400">Loading cooked meals...</p>
          ) : meals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center bg-stone-50">
              <p className="text-sm font-semibold text-stone-600">No cooked meals yet</p>
              <p className="text-xs text-stone-400 mt-1">Complete a recipe in Cook Mode and it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {groupedMeals.map((meal) => (
                <div key={meal.id} className="rounded-xl border border-stone-100 px-3.5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Utensils size={14} className="text-orange-400 shrink-0" />
                        <p className="text-sm font-semibold text-stone-800 truncate">
                          {meal.recipe_name}
                        </p>
                        {meal.count > 1 && (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-md shrink-0">
                            {meal.count}x
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        {meal.count > 1 ? "Last cooked " : "Cooked "}
                        {formatCookedAt(meal.cooked_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {meal.recipe_id && (
                        <button
                          onClick={() => navigate(`/cook/${meal.recipe_id}`)}
                          className="text-[11px] font-semibold text-stone-500 hover:text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg inline-flex items-center gap-0.5"
                        >
                          Open <ChevronRight size={12} />
                        </button>
                      )}

                      {meal.total_savings > 0 && isPremium ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full whitespace-nowrap">
                          Saved ≈ ${meal.total_savings.toFixed(2)}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEstimateSavings(meal.id)}
                          disabled={estimatingMealId === meal.id || !isPremium}
                          className="text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-full disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          {isPremium ? <Sparkles size={12} /> : <Lock size={12} />} {estimatingMealId === meal.id ? "Estimating..." : isPremium ? "Estimate savings" : "Premium"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
