import { useLocation, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, Flame, Heart, ShoppingCart, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const TUTORIAL_MAP: Record<string, string> = {
  Home: 'nav-home',
  Pantry: 'nav-pantry',
  Browse: 'nav-browse',
  Recipes: 'nav-recipes',
  Plan: 'nav-plan',
  Grocery: 'nav-grocery',
};

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/pantry', label: 'Pantry', icon: UtensilsCrossed },
  { path: '/swipe', label: 'Browse', icon: Flame },
  { path: '/saved', label: 'Recipes', icon: Heart },
  { path: '/meal-prep', label: 'Plan', icon: CalendarDays },
  { path: '/grocery', label: 'Grocery', icon: ShoppingCart },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              data-tutorial={TUTORIAL_MAP[label]}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'fill-primary/20')} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
