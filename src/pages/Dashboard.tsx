import { useState, useEffect } from "react";
import {
  Flame,
  Clock,
  Heart,
  ShoppingCart,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Calendar,
  Star,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ── Mock data (replace with your real data / hooks) ──────────────────────────
const STATS = [
  { label: "Recipes Saved", value: "42", icon: Heart, color: "text-rose-500", bg: "bg-rose-50" },
  { label: "Meals This Week", value: "14", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
  { label: "Avg Cook Time", value: "28m", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
  { label: "Items to Buy", value: "9", icon: ShoppingCart, color: "text-violet-500", bg: "bg-violet-50" },
];

const ACTIVITY = [
  { type: "saved", text: "Saved Shakshuka with Feta", time: "2h ago", emoji: "🍳" },
  { type: "cooked", text: "Marked Pasta Carbonara as cooked", time: "Yesterday", emoji: "✅" },
  { type: "added", text: "Added 6 items to grocery list", time: "Yesterday", emoji: "🛒" },
  { type: "planned", text: "Planned meals for the week", time: "2 days ago", emoji: "📅" },
  { type: "saved", text: "Saved Thai Green Curry", time: "3 days ago", emoji: "🍛" },
  { type: "cooked", text: "Marked Avocado Toast as cooked", time: "4 days ago", emoji: "✅" },
];

const SUGGESTED = [
  {
    id: 1,
    title: "Lemon Herb Salmon",
    time: "25 min",
    rating: 4.8,
    tag: "High Protein",
    emoji: "🐟",
    color: "from-blue-50 to-cyan-50",
  },
  {
    id: 2,
    title: "Mushroom Risotto",
    time: "40 min",
    rating: 4.6,
    tag: "Vegetarian",
    emoji: "🍄",
    color: "from-amber-50 to-orange-50",
  },
  {
    id: 3,
    title: "BBQ Chicken Bowl",
    time: "30 min",
    rating: 4.7,
    tag: "Popular",
    emoji: "🍗",
    color: "from-rose-50 to-pink-50",
  },
];

const MEAL_PLAN = [
  { day: "Mon", meal: "Pasta Carbonara", done: true },
  { day: "Tue", meal: "Thai Green Curry", done: true },
  { day: "Wed", meal: "Lemon Herb Salmon", done: false },
  { day: "Thu", meal: "—", done: false },
  { day: "Fri", meal: "BBQ Chicken Bowl", done: false },
];

export default function Dashboard() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', session.user.id)
          .single();
        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
      }
    }
    loadProfile();
  }, []);

  return (
    <div className="min-h-full bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}{displayName ? `, ${displayName}` : ''} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's what's cooking this week</p>
          </div>
          <Link
            to="/swipe"
            className="hidden sm:flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Sparkles size={15} />
            Find Recipes
          </Link>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATS.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Two-column grid on desktop ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: main content (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Suggested for you */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={17} className="text-orange-500" />
                  <h2 className="text-base font-bold text-gray-900">Suggested for you</h2>
                </div>
                <Link to="/swipe" className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">
                  See all <ChevronRight size={13} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                {SUGGESTED.map((recipe) => (
                  <div key={recipe.id} className={`p-4 bg-gradient-to-br ${recipe.color} hover:brightness-95 cursor-pointer transition-all group`}>
                    <div className="text-4xl mb-3">{recipe.emoji}</div>
                    <div className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                      {recipe.title}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={11} /> {recipe.time}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" /> {recipe.rating}
                      </span>
                    </div>
                    <span className="inline-block text-xs bg-white/60 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {recipe.tag}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* This week's meal plan */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={17} className="text-orange-500" />
                  <h2 className="text-base font-bold text-gray-900">This week</h2>
                </div>
                <Link to="/mealprep" className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">
                  Meal Prep <ChevronRight size={13} />
                </Link>
              </div>

              <div className="space-y-2">
                {MEAL_PLAN.map(({ day, meal, done }) => (
                  <div
                    key={day}
                    className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-colors ${
                      done ? "bg-green-50" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className={`text-xs font-bold w-8 shrink-0 ${done ? "text-green-600" : "text-gray-500"}`}>
                      {day}
                    </div>
                    <div className={`text-sm flex-1 ${done ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>
                      {meal}
                    </div>
                    {!done && meal === "—" && (
                      <button className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">
                        <Plus size={12} /> Add
                      </button>
                    )}
                    {done && <span className="text-xs text-green-500 font-semibold">Done</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT: activity feed (1/3 width) */}
          <div className="space-y-6">

            {/* Quick actions */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">Quick actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Find Recipe", to: "/browse", emoji: "🔍" },
                  { label: "Add to Pantry", to: "/pantry", emoji: "📦" },
                  { label: "Grocery List", to: "/grocery", emoji: "🛒" },
                  { label: "Plan Meals", to: "/mealprep", emoji: "📅" },
                ].map(({ label, to, emoji }) => (
                  <Link
                    key={label}
                    to={to}
                    className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 hover:bg-orange-50 rounded-xl transition-colors text-center group"
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-semibold text-gray-600 group-hover:text-orange-600 transition-colors leading-tight">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Activity feed */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">Recent activity</h2>
              <div className="space-y-3">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-base shrink-0">
                      {item.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-800 font-medium leading-snug">{item.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
