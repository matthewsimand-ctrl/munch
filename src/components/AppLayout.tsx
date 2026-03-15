import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Heart,
  ShoppingCart,
  Package,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  CookingPot,
  History,
  Users,
  Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { MunchLogo } from "@/components/MunchLogo";
import { useKitchens } from "@/hooks/useKitchens";
import BottomNav from "@/components/BottomNav";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/swipe", icon: BookOpen, label: "Find Recipes" },
  { to: "/saved", icon: Heart, label: "My Recipes" },
  { to: "/let-me-cook", icon: CookingPot, label: "Let me Cook" },
  { to: "/pantry", icon: Package, label: "Pantry" },
  { to: "/grocery", icon: ShoppingCart, label: "Grocery List" },
  { to: "/meal-prep", icon: CalendarDays, label: "Meal Prep", premium: true },
  { to: "/kitchens", icon: Users, label: "Kitchens", premium: true },
  { to: "/cooked-history", icon: History, label: "Cooked" },
  { to: "/dictionary", icon: BookMarked, label: "Dictionary" },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [planType, setPlanType] = useState("Free Plan");
  const { displayName: storeDisplayName, activeKitchenName } = useStore();
  const { kitchens } = useKitchens();

  useEffect(() => {
    const hydrateFooterProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle();

        const persistedName = profile?.display_name?.trim();
        const fallbackName = user.user_metadata?.display_name?.trim();
        if (persistedName || fallbackName) {
          setDisplayName((persistedName || fallbackName) as string);
          return;
        }
      }

      // Fallback to store name for Guests or users without a profile record
      if (storeDisplayName) {
        setDisplayName(storeDisplayName);
      } else {
        setDisplayName("");
      }

      if (user) {
        const metadataPlan = user.user_metadata?.plan_type || user.user_metadata?.plan || user.user_metadata?.subscription;
        if (typeof metadataPlan === "string" && metadataPlan.trim()) {
          setPlanType(metadataPlan.trim());
        }
      }
    };

    hydrateFooterProfile();
  }, [storeDisplayName]);

  return (
    <div className="flex min-h-screen h-[100dvh] bg-gradient-to-br from-orange-50/50 via-background to-background overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-100 shrink-0 z-20 transition-all duration-300 relative ${collapsed ? "w-16" : "w-56 lg:w-64"
          }`}
      >
        {/* Collapse toggle on the edge */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 z-30 text-gray-400 hover:text-gray-600 transition-colors bg-white border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center shadow-sm"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo */}
        <div className="flex items-center px-3 py-5 border-b border-gray-100">
          <div
            className={`flex items-center gap-2.5 transition-all ${collapsed ? "mx-auto" : "ml-2"
              }`}
          >
            <MunchLogo
              size={collapsed ? 32 : 36}
              showWordmark={!collapsed}
              wordmark="munch"
              wordmarkClassName="text-lg font-bold text-gray-900 tracking-tight"
            />
          </div>
        </div>

        {!collapsed && kitchens.length > 0 && (
          <div className="mx-3 mt-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Kitchen Mode</p>
            <p className="mt-1 text-sm font-semibold text-stone-800 truncate">{activeKitchenName || "Choose a kitchen"}</p>
            <NavLink to="/kitchens" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700">
              <Users size={12} /> Manage kitchens
            </NavLink>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, premium }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              data-tutorial={`nav-${to.replace("/", "") || "dashboard"}`}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={`shrink-0 transition-colors ${isActive
                      ? "text-orange-500"
                      : "text-gray-400 group-hover:text-gray-600"
                      }`}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span>{label}</span>
                        {premium ? <Crown size={12} className="text-orange-500" /> : null}
                      </span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          <NavLink
            to="/settings"
            data-tutorial="profile-settings"
            className={`flex items-center rounded-xl hover:bg-gray-50 cursor-pointer transition-colors py-2 ${collapsed ? "justify-center px-2" : "gap-3 px-2"
              }`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              M
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">
                  {displayName ? `${displayName}'s Kitchen` : "My Kitchen"}
                </div>
                <div className="text-xs text-gray-400 truncate">Settings | {planType}</div>
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-[max(0.25rem,calc(env(safe-area-inset-top)-1rem))] pb-[calc(var(--mobile-nav-offset)+0.35rem)] md:pt-0 md:pb-0">
          <div className="app-page">
            <Outlet />
          </div>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </main>
    </div>
  );
}
