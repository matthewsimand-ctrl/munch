import { useState } from "react";
import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Heart,
  ShoppingCart,
  Package,
  CalendarDays,
  ChefHat,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/swipe", icon: BookOpen, label: "Explore" },
  { to: "/saved", icon: Heart, label: "My Recipes" },
  { to: "/pantry", icon: Package, label: "Pantry" },
  { to: "/grocery", icon: ShoppingCart, label: "Grocery" },
  { to: "/meal-prep", icon: CalendarDays, label: "Meal Prep" },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-100 shrink-0 z-20 transition-all duration-300 relative ${
          collapsed ? "w-16" : "w-56 lg:w-64"
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
            className={`flex items-center gap-2.5 transition-all ${
              collapsed ? "mx-auto" : "ml-2"
            }`}
          >
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <ChefHat className="text-white" size={18} />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-gray-900 tracking-tight">munch</span>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={`shrink-0 transition-colors ${
                      isActive
                        ? "text-orange-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {!collapsed && (
                    <>
                      <span>{label}</span>
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
            className={`flex items-center rounded-xl hover:bg-gray-50 cursor-pointer transition-colors py-2 ${
              collapsed ? "justify-center px-2" : "gap-3 px-2"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              M
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">My Kitchen</div>
                <div className="text-xs text-gray-400 truncate">Free Plan</div>
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </div>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex z-50">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors
                ${isActive ? "text-orange-500" : "text-gray-400"}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] leading-tight">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}
