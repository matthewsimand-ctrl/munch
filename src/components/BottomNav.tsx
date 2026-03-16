import { forwardRef, type ComponentPropsWithoutRef } from 'react';
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

const BottomNav = forwardRef<HTMLElement, ComponentPropsWithoutRef<'nav'>>((props, ref) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      ref={ref}
      {...props}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-orange-100/80 bg-[#fff8f2] shadow-[0_-10px_28px_rgba(28,25,23,0.08)] backdrop-blur-xl safe-area-x"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-[var(--mobile-nav-height)] max-w-md items-center justify-around px-1.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              data-tutorial={TUTORIAL_MAP[label]}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', active && 'fill-primary/20')} />
              <span className="truncate text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
