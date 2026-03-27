import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Heart, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TUTORIAL_MAP: Record<string, string> = {
  Home: 'nav-home',
  Recipes: 'nav-browse',
  Saved: 'nav-recipes',
  Groceries: 'nav-grocery',
  Profile: 'profile-settings',
};

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/swipe', label: 'Recipes', icon: BookOpen },
  { path: '/saved', label: 'Saved', icon: Heart },
  { path: '/groceries', label: 'Groceries', icon: ShoppingCart },
  { path: '/settings', label: 'Profile', icon: User },
];

const BottomNav = forwardRef<HTMLElement, ComponentPropsWithoutRef<'nav'>>((props, ref) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      ref={ref}
      {...props}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-orange-100/80 bg-[#fff8f2]/96 shadow-[0_-10px_28px_rgba(28,25,23,0.08)] backdrop-blur-xl safe-area-x"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-[var(--mobile-nav-height)] w-full items-center justify-around px-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = path === '/settings'
            ? location.pathname.startsWith('/settings')
            : location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              data-tutorial={TUTORIAL_MAP[label]}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-all',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-2xl transition-all',
                active ? 'bg-white shadow-[0_8px_18px_rgba(249,115,22,0.18)]' : 'bg-transparent'
              )}>
                <Icon className={cn('h-5 w-5 shrink-0 transition-transform', active && 'fill-primary/20 scale-105')} />
              </span>
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
