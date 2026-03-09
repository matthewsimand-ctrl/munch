import { useState } from "react";
import { Heart, Clock, Users, Star, Search, Filter, Flame, Trash2, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

// ── Mock saved data ───────────────────────────────────────────────────────────
const SAVED_RECIPES = [
  { id: 1, title: "Shakshuka with Feta", time: "25 min", servings: 4, rating: 4.8, calories: 320, tags: ["Vegetarian", "Mediterranean"], emoji: "🍳", gradient: "from-amber-400 to-red-400", savedDate: "Today" },
  { id: 2, title: "Thai Green Curry", time: "35 min", servings: 4, rating: 4.7, calories: 480, tags: ["Gluten-Free", "Spicy"], emoji: "🍛", gradient: "from-green-400 to-teal-400", savedDate: "Yesterday" },
  { id: 3, title: "Lemon Herb Salmon", time: "20 min", servings: 2, rating: 4.9, calories: 410, tags: ["High Protein", "Quick"], emoji: "🐟", gradient: "from-blue-400 to-cyan-400", savedDate: "2 days ago" },
  { id: 4, title: "Mushroom Risotto", time: "45 min", servings: 4, rating: 4.6, calories: 520, tags: ["Vegetarian", "Italian"], emoji: "🍄", gradient: "from-amber-600 to-amber-400", savedDate: "3 days ago" },
  { id: 5, title: "BBQ Chicken Bowl", time: "30 min", servings: 2, rating: 4.7, calories: 550, tags: ["High Protein", "Meal Prep"], emoji: "🍗", gradient: "from-rose-500 to-yellow-400", savedDate: "4 days ago" },
  { id: 6, title: "Avocado Toast Deluxe", time: "10 min", servings: 1, rating: 4.5, calories: 290, tags: ["Vegetarian", "Quick"], emoji: "🥑", gradient: "from-lime-400 to-green-400", savedDate: "5 days ago" },
  { id: 7, title: "Beef Tacos", time: "20 min", servings: 4, rating: 4.8, calories: 480, tags: ["Mexican", "Family"], emoji: "🌮", gradient: "from-orange-500 to-red-500", savedDate: "1 week ago" },
  { id: 8, title: "Greek Salad", time: "10 min", servings: 2, rating: 4.4, calories: 180, tags: ["Vegetarian", "Light"], emoji: "🥗", gradient: "from-blue-400 to-indigo-400", savedDate: "1 week ago" },
  { id: 9, title: "Pad Thai", time: "25 min", servings: 2, rating: 4.7, calories: 520, tags: ["Asian", "Noodles"], emoji: "🍜", gradient: "from-yellow-400 to-orange-400", savedDate: "2 weeks ago" },
];

const FILTER_TAGS = ["All", "Vegetarian", "High Protein", "Quick", "Gluten-Free", "Asian", "Italian", "Meal Prep"];

type SortOption = "newest" | "rating" | "time" | "calories";

export default function SavedRecipes() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [saved, setSaved] = useState(SAVED_RECIPES.map((r) => r.id));

  const filtered = SAVED_RECIPES
    .filter((r) => saved.includes(r.id))
    .filter((r) => activeTag === "All" || r.tags.includes(activeTag))
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "time") return parseInt(a.time) - parseInt(b.time);
      if (sort === "calories") return a.calories - b.calories;
      return 0; // newest = original order
    });

  const handleRemove = (id: number) => {
    setSaved((s) => s.filter((i) => i !== id));
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-orange-500">Saved Recipes</h1>
              <p className="text-sm text-gray-500 mt-0.5">{saved.length} recipes in your collection</p>
            </div>
            <Link
              to="/browse"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Heart size={15} />
              Browse More
            </Link>
          </div>

          {/* Search + sort row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your recipes…"
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 border border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-orange-300 transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="appearance-none pl-9 pr-8 py-2.5 text-sm bg-gray-100 border border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-orange-300 transition-all text-gray-700 font-medium cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="rating">Highest rated</option>
                <option value="time">Quickest first</option>
                <option value="calories">Lowest calories</option>
              </select>
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Tag filters */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {FILTER_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                activeTag === tag
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="text-lg font-semibold text-gray-700">No recipes found</h3>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {/* Card visual */}
                <div className={`h-36 bg-gradient-to-br ${recipe.gradient} relative flex items-center justify-center`}>
                  <span className="text-5xl">{recipe.emoji}</span>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(recipe.id)}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-red-500/80 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>

                  {/* Rating badge */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-white text-xs font-semibold">
                    <Star size={10} className="fill-white" /> {recipe.rating}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-3.5">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 leading-tight group-hover:text-orange-600 transition-colors">
                    {recipe.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2.5">
                    <span className="flex items-center gap-1"><Clock size={11} /> {recipe.time}</span>
                    <span className="flex items-center gap-1"><Flame size={11} /> {recipe.calories} cal</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {recipe.servings}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {recipe.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{recipe.savedDate}</span>
                    <button className="text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors">
                      View Recipe →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
