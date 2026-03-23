import { useState } from "react";
import { Outlet } from "react-router-dom";
import { NavLink, useLocation } from "react-router-dom";
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
  Crown,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { MunchLogo } from "@/components/MunchLogo";
import BottomNav from "@/components/BottomNav";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/swipe", icon: BookOpen, label: "Find Recipes" },
  { to: "/saved", icon: Heart, label: "My Recipes" },
  { to: "/pantry", icon: Package, label: "Pantry" },
  { to: "/grocery", icon: ShoppingCart, label: "Grocery List" },
  { to: "/meal-prep", icon: CalendarDays, label: "Meal Prep", premium: true },
  { to: "/dictionary", icon: BookMarked, label: "Dictionary" },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { displayName: storeDisplayName } = useStore();
  const isChefProfileRoute = location.pathname.startsWith("/chef/");
  const displayName = storeDisplayName || "";
  const planType = "Free Plan";

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
      <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        <div data-app-scroll className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-[max(0.25rem,calc(env(safe-area-inset-top)-1rem))] pb-[calc(var(--mobile-nav-offset)+0.1rem)] md:pt-0 md:pb-0">
          <div className="app-page">
            <Outlet />
          </div>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        <div className="md:hidden">
          {!isChefProfileRoute ? <BottomNav /> : null}
        </div>
      </main>
    </div>
  );
}
