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
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-2 safe-area-x"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <div className="mx-auto flex h-[calc(var(--mobile-nav-height)+0.4rem)] max-w-md items-center justify-around rounded-[1.65rem] border border-orange-100/80 bg-[#fff8f2]/96 px-2 shadow-[0_16px_40px_rgba(28,25,23,0.12)] backdrop-blur-xl">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              data-tutorial={TUTORIAL_MAP[label]}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-all',
                active
                  ? 'bg-white text-primary shadow-[0_8px_18px_rgba(249,115,22,0.18)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0 transition-transform', active && 'fill-primary/20 scale-105')} />
              <span className={cn('truncate text-[10px] font-semibold', active ? 'text-primary' : 'text-stone-500')}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
