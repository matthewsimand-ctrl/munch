import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Heart, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const TUTORIAL_MAP: Record<string, string> = {
  Home: 'nav-home',
  Recipes: 'nav-browse',
  Saved: 'nav-recipes',
  Groceries: 'nav-grocery',
};

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/swipe', label: 'Recipes', icon: BookOpen },
  { path: '/saved', label: 'Saved', icon: Heart },
  { path: '/groceries', label: 'Groceries', icon: ShoppingCart },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-x"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.35rem)' }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-14 px-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              data-tutorial={TUTORIAL_MAP[label]}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors min-w-0 flex-1',
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
  );
}
