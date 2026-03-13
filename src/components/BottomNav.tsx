import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Home, UtensilsCrossed, BookOpen, CookingPot, Ellipsis, Heart, ShoppingCart, CalendarDays, History, BookMarked, Settings, BookOpenCheck, Users, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNotifications } from '@/hooks/useNotifications';

const TUTORIAL_MAP: Record<string, string> = {
  Home: 'nav-home',
  Pantry: 'nav-pantry',
  Recipes: 'nav-browse',
  'Find Recipes': 'nav-browse',
  Saved: 'nav-recipes',
  Plan: 'nav-plan',
  Grocery: 'nav-grocery',
  'Grocery List': 'nav-grocery',
  Cook: 'nav-let-me-cook',
  More: 'nav-more',
};

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/swipe', label: 'Find Recipes', icon: BookOpen },
  { path: '/let-me-cook', label: 'Cook', icon: CookingPot },
  { path: '/pantry', label: 'Kitchen', icon: UtensilsCrossed },
  { path: '__more__', label: 'More', icon: Ellipsis },
];

const MORE_ITEMS = [
  { path: '/grocery', label: 'Grocery List', icon: ShoppingCart },
  { path: '/meal-prep', label: 'Meal Prep', icon: CalendarDays },
  { path: '/kitchens', label: 'Kitchens', icon: Users },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/saved', label: 'My Recipes', icon: Heart },
  { path: '/cookbooks', label: 'Cookbooks', icon: BookOpenCheck },
  { path: '/cooked-history', label: 'Cooked', icon: History },
  { path: '/dictionary', label: 'Dictionary', icon: BookMarked },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const isMoreActive = MORE_ITEMS.some(({ path }) => location.pathname === path);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom safe-area-x">
        <div className="max-w-md mx-auto flex items-center justify-around h-16 px-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = path === '__more__' ? isMoreActive || moreOpen : location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => {
                  if (path === '__more__') {
                    setMoreOpen(true);
                    return;
                  }
                  navigate(path);
                }}
                data-tutorial={TUTORIAL_MAP[label]}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg transition-colors min-w-0 flex-1',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', active && 'fill-primary/20')} />
                <span className="text-[10px] font-medium truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle>More</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-5">
            {MORE_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(path);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition-colors",
                    active
                      ? "border-orange-300 bg-orange-50 text-orange-600"
                      : "border-border bg-card text-foreground hover:border-orange-200 hover:bg-orange-50/60"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold leading-tight">{label}</span>
                    {path === '/notifications' && unreadCount > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
