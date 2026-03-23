import { Link } from "react-router-dom";
import { BookOpen, Heart, Package, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";

const QUICK_LINKS = [
  { to: "/swipe", label: "Find Recipes", icon: BookOpen, tone: "bg-orange-50 text-orange-600" },
  { to: "/saved", label: "Saved Recipes", icon: Heart, tone: "bg-rose-50 text-rose-600" },
  { to: "/pantry", label: "Pantry", icon: Package, tone: "bg-emerald-50 text-emerald-600" },
  { to: "/groceries", label: "Groceries", icon: ShoppingCart, tone: "bg-sky-50 text-sky-600" },
];

export default function Dashboard() {
  const displayName = useStore((state) => state.displayName);

  return (
    <div
      className="min-h-full"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        background: "#FFFAF5",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <section
          className="overflow-hidden rounded-[2rem] border border-orange-100 px-5 py-6 sm:px-8 sm:py-8"
          style={{
            background: "linear-gradient(135deg,#fff7ed 0%,#ffffff 48%,#fff1e6 100%)",
            boxShadow: "0 16px 40px rgba(28,25,23,0.08)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-orange-600">Dashboard Isolation Mode</p>
          <h1
            className="mt-3 text-4xl font-bold text-stone-900 sm:text-5xl"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {displayName ? `Chef ${displayName}` : "Chef"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
            This is a stripped-down dashboard build to isolate the production freeze. If this version stays interactive on the published site,
            the issue is inside the original dashboard widgets rather than the app shell itself.
          </p>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_10px_28px_rgba(28,25,23,0.05)]">
          <h2
            className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Quick Actions
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Use these links while we isolate the dashboard-specific production issue.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map(({ to, label, icon: Icon, tone }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4 transition-colors hover:border-orange-200 hover:bg-orange-50/50"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                  <Icon size={18} />
                </div>
                <span className="text-sm font-semibold text-stone-700">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
