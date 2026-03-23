import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import {
  Sparkles, Plus, Search, Heart, UtensilsCrossed,
  ShoppingCart, CalendarDays, History, BookMarked, ArrowRight,
  ChefHat, TrendingUp, Zap, LayoutDashboard, Timer, Volume2, Star,
  Trophy, CheckCircle2, Compass, X, Settings
} from 'lucide-react';

interface TutorialStep {
  route: string;
  target?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: 'above' | 'below' | 'center' | 'left' | 'right';
  requireCondition?: (state: any) => boolean;
  interactionHint?: string;
}

const ROUTE_TAB_TARGET: Record<string, { target: string; label: string }> = {
  '/dashboard': { target: 'nav-dashboard', label: 'Dashboard' },
  '/swipe': { target: 'nav-swipe', label: 'Find Recipes' },
  '/saved': { target: 'nav-saved', label: 'My Recipes' },
  '/let-me-cook': { target: 'nav-let-me-cook', label: 'Let me Cook' },
  '/pantry': { target: 'nav-pantry', label: 'Pantry' },
  '/grocery': { target: 'nav-grocery', label: 'Grocery List' },
  '/meal-prep': { target: 'nav-meal-prep', label: 'Meal Prep' },
  '/dictionary': { target: 'nav-dictionary', label: 'Dictionary' },
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    route: '/dashboard',
    target: 'dashboard-stats',
    title: 'Your Kitchen Hub',
    description: 'Welcome to Munch! Track your cooking streaks, earn XP, and level up as you master new skills.',
    icon: <Zap className="h-5 w-5" />,
    position: 'right',
  },
  {
    route: '/dashboard',
    target: 'dashboard-suggestions',
    title: 'Tailored Suggestions',
    description: 'Get daily inspiration based on what you have in your pantry and your flavor profile.',
    icon: <TrendingUp className="h-5 w-5" />,
    position: 'below',
  },
  {
    route: '/dashboard',
    target: 'nav-swipe',
    title: 'The Discovery Engine',
    description: 'Ready to find your next meal? Use the Discovery Engine to swipe through personalized recipes.',
    icon: <Compass className="h-5 w-5" />,
    position: 'right',
  },
  {
    route: '/swipe',
    target: 'swipe-stack',
    title: 'Discovery Feed',
    description: 'Swipe right for recipes you love, or left to skip. Every swipe helps us learn your taste.',
    icon: <Sparkles className="h-5 w-5" />,
    position: 'right',
  },
  {
    route: '/swipe',
    target: 'match-percentage',
    title: 'Match Engine',
    description: 'Our Match Engine tells you exactly what percentage of a recipe\'s ingredients you already have in your pantry.',
    icon: <Search className="h-5 w-5" />,
    position: 'below',
  },
  {
    route: '/swipe',
    target: 'nav-saved',
    title: 'Your Cookbook',
    description: 'Everything you like or save gets organized automatically in your personal collection.',
    icon: <Heart className="h-5 w-5" />,
    position: 'right',
  },
  {
    route: '/saved',
    target: 'recipes-nav',
    title: 'Your Library',
    description: 'Access all your saved recipes or organize them into custom Cookbooks to keep your favorite meals organized neatly.',
    icon: <BookMarked className="h-5 w-5" />,
    position: 'below',
  },
  {
    route: '/saved',
    target: 'nav-let-me-cook',
    title: 'Ready to Cook?',
    description: 'Ready to cook? Head over to Let Me Cook to find perfect recipes for exactly what you have on hand.',
    icon: <ChefHat className="h-5 w-5" />,
    position: 'right',
  },
  {
    route: '/let-me-cook',
    target: 'pantry-status-card',
    title: 'Smart Matching',
    description: 'We analyze your fridge and pantry to find culinary gems you can make right now.',
    icon: <Sparkles className="h-5 w-5" />,
    position: 'below',
  },
  {
    route: '/let-me-cook',
    target: 'nav-pantry',
    title: 'Digital Pantry',
    description: 'Keep your digital kitchen in sync with your real one for accurate match percentages.',
    icon: <Plus className="h-5 w-5" />,
    position: 'right',
  },
  {
    route: '/pantry',
    target: 'pantry-add-form',
    title: 'Stock Management',
    description: 'Add your ingredients here. Munch automatically categorizes them and tracks your inventory.',
    icon: <Plus className="h-5 w-5" />,
    position: 'below',
  },
  {
    route: '/pantry',
    target: 'nav-grocery',
    title: 'Smart Shopping',
    description: 'Never forget an ingredient again. Your shopping list is always just a tap away.',
    icon: <ShoppingCart className="h-5 w-5" />,
    position: 'right',
  },
  {
    route: '/grocery',
    target: 'grocery-list-container',
    title: 'Automatic Lists',
    description: 'Add missing items or use our AI price estimator to plan your grocery runs efficiently.',
    icon: <ShoppingCart className="h-5 w-5" />,
    position: 'below',
  },
  {
    route: '/grocery',
    target: 'profile-settings',
    title: 'Custom Preferences',
    description: 'Set your dietary restrictions, skill level, and flavor profiles to make Munch truly yours.',
    icon: <Settings className="h-5 w-5" />,
    position: 'right',
  },
  {
    route: '/dashboard',
    title: 'Tour Complete! 👨‍🍳',
    description: 'The kitchen is yours. Go create something amazing!',
    icon: <CheckCircle2 className="h-5 w-5" />,
    position: 'center',
  },
];

export default function SpotlightTutorial({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(240);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore();

  const step = TUTORIAL_STEPS[currentStep];
  const pad = 12;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const isOnExpectedRoute = useMemo(() => {
    if (step.route.includes(':id')) {
      return location.pathname.startsWith('/cook/');
    }
    return location.pathname === step.route;
  }, [location, step.route]);

  const routeTab = useMemo(() =>
    ROUTE_TAB_TARGET[step.route.replace('/:id', '')] || ROUTE_TAB_TARGET[step.route],
    [step.route]
  );

  const activeTarget = useMemo(() => {
    if (!isOnExpectedRoute) return routeTab?.target;

    // Recovery logic: if we're on a step that needs the dialog but it's closed, 
    // point back to the card so the user can re-open it without being blocked.
    const isDetailStep = step.target?.includes('dialog') ||
      step.target === 'add-missing-button';
    const dialogClosed = !document.querySelector('[role="dialog"]');

    if (isDetailStep && dialogClosed && step.route === '/swipe') {
      return 'recipe-card';
    }

    return step.target;
  }, [isOnExpectedRoute, step, routeTab]);

  const activePosition = useMemo(() => {
    if (!isOnExpectedRoute && routeTab) {
      // For sidebar navigation, "right" is usually best if possible
      return 'right';
    }
    return step.position;
  }, [isOnExpectedRoute, step.position, routeTab]);

  const isConditionMet = useMemo(() => {
    if (!step.requireCondition) return true;
    return step.requireCondition(store);
  }, [step, store]);

  useEffect(() => {
    if (isOnExpectedRoute && isConditionMet && step.requireCondition && !isLast) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 100); // 100ms for near-instant snap
      return () => clearTimeout(timer);
    }
  }, [isConditionMet, isOnExpectedRoute, step.requireCondition, isLast]);

  // Scroll to top when route changes during tutorial
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const stepDescription = useMemo(() => {
    if (!isOnExpectedRoute) {
      const tabLabel = routeTab?.label ?? 'the correct tab';
      return `Navigate to the ${tabLabel} to continue the tour.`;
    }

    // Check if we are in a step that expects a dialog but it's closed
    const needsDialog = step.target?.includes('dialog') || step.target === 'add-missing-button';
    const dialogClosed = !document.querySelector('[role="dialog"]');

    if (needsDialog && dialogClosed) {
      return 'Click on the closed recipe card.';
    }

    // Only show the hint if we are on a step that requires an action and the action isn't possible 
    // because the target is missing, OR if the user is stuck.
    const targetExists = !!document.querySelector(`[data-tutorial="${activeTarget}"]`);
    if (!isConditionMet && step.interactionHint && !targetExists) {
      return step.interactionHint;
    }
    return step.description;
  }, [isOnExpectedRoute, isConditionMet, step, routeTab, activeTarget]);

  useEffect(() => {
    if (!tooltipRef.current) return;
    setTooltipHeight(tooltipRef.current.offsetHeight || 240);
  }, [currentStep, stepDescription]);

  const updateSpotlight = useCallback(() => {
    if (!activeTarget) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial="${activeTarget}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      // Only update if the rect has content and is visible
      if (rect.width > 0 && rect.height > 0) {
        setSpotlightRect(rect);
      }
    } else {
      setSpotlightRect(null);
    }
  }, [activeTarget]);

  useEffect(() => {
    const scheduleUpdate = () => {
      window.requestAnimationFrame(() => {
        updateSpotlight();
      });
    };

    scheduleUpdate();
    const timeoutA = window.setTimeout(scheduleUpdate, 120);
    const timeoutB = window.setTimeout(scheduleUpdate, 320);
    const mutationObserver = new MutationObserver(() => {
      scheduleUpdate();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tutorial', 'style', 'class'],
    });

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      window.clearTimeout(timeoutA);
      window.clearTimeout(timeoutB);
      mutationObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [updateSpotlight, currentStep, location.pathname]);

  const next = useCallback(() => {
    if (!isOnExpectedRoute) {
      navigate(step.route.replace(':id', 'tutorial-omelette'));
      return;
    }
    if (!isConditionMet) return;

    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [isOnExpectedRoute, navigate, step.route, currentStep, onComplete, isConditionMet]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === 'ArrowRight') next();
        // Left arrow is trapped but doesn't necessarily advance (user might want to stay)
        // unless you want it to go "Prev", but user only asked to stop background action.
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [next]);

  const skip = () => {
    navigate('/dashboard');
    onComplete();
  };

  const getTooltipStyle = (): React.CSSProperties => {
    const topPadding = 20;
    const bottomPadding = 120; // Increased to prevent bottom cut-offs
    const pos = activePosition;
    if (pos === 'center' || !spotlightRect) {
      return { top: '50%', transform: 'translateY(-50%)' };
    }

    if (pos === 'below') {
      return { top: `${spotlightRect.bottom + 16}px` };
    }
    if (pos === 'above') {
      return { top: `${spotlightRect.top - tooltipHeight - 32}px` };
    }
    if (pos === 'left') {
      const horizontalSpace = spotlightRect.left;
      if (horizontalSpace < 400) { // Not enough room for tooltip on left
        return { top: '50%', transform: 'translateY(-50%)', left: '16px', right: '16px', maxWidth: '380px', margin: '0 auto' };
      }
      const preferredTop = spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2;
      const clampedTop = Math.min(Math.max(preferredTop, topPadding), window.innerHeight - tooltipHeight - bottomPadding);
      return {
        top: `${clampedTop}px`,
        left: `${spotlightRect.left - 410}px`,
        maxWidth: '380px'
      };
    }
    if (pos === 'right') {
      const horizontalSpace = window.innerWidth - spotlightRect.right;
      if (horizontalSpace < 400) { // Not enough room for tooltip on right
        return { top: '50%', transform: 'translateY(-50%)', left: '16px', right: '16px', maxWidth: '380px', margin: '0 auto' };
      }
      const preferredTop = spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2;
      const clampedTop = Math.min(Math.max(preferredTop, topPadding), window.innerHeight - tooltipHeight - bottomPadding);
      return {
        top: `${clampedTop}px`,
        left: `${spotlightRect.right + 24}px`,
        maxWidth: '380px'
      };
    }

    const placeAbove = spotlightRect.top > window.innerHeight * 0.52;
    const preferredTop = placeAbove
      ? spotlightRect.top - tooltipHeight - 32
      : spotlightRect.bottom + 16;
    const clampedTop = Math.min(Math.max(preferredTop, topPadding), window.innerHeight - tooltipHeight - bottomPadding);
    return { top: `${clampedTop}px` };
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {spotlightRect && (
        <>
          <div className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-auto" style={{ height: spotlightRect.top - pad }} onClick={e => e.stopPropagation()} />
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 pointer-events-auto" style={{ top: spotlightRect.bottom + pad }} onClick={e => e.stopPropagation()} />
          <div className="absolute left-0 bg-black/60 pointer-events-auto" style={{ top: spotlightRect.top - pad, bottom: window.innerHeight - (spotlightRect.bottom + pad), width: spotlightRect.left - pad }} onClick={e => e.stopPropagation()} />
          <div className="absolute right-0 bg-black/60 pointer-events-auto" style={{ top: spotlightRect.top - pad, bottom: window.innerHeight - (spotlightRect.bottom + pad), left: spotlightRect.right + pad }} onClick={e => e.stopPropagation()} />
        </>
      )}
      {(!spotlightRect || step.position === 'center') && (
        <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={e => e.stopPropagation()} />
      )}

      {spotlightRect && (
        <motion.div
          layoutId="spotlight-ring"
          initial={false}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }} // Snappy spring for visibility
          className="absolute border-2 border-orange-500 rounded-xl pointer-events-none"
          style={{
            left: spotlightRect.left - pad,
            top: spotlightRect.top - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
          }}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute left-4 right-4 max-w-sm mx-auto z-[10000]"
          style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
          ref={tooltipRef}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 shadow-inner">
                {step.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-foreground text-base truncate">{step.title}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                  Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                </p>
              </div>
            </div>

            <p className="text-sm text-stone-600 mb-5 leading-relaxed font-semibold">
              {stepDescription}
            </p>

            <div className="flex items-center justify-between gap-4">
              <button onClick={skip} className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium">
                Skip
              </button>
              <Button
                onClick={next}
                size="sm"
                className="rounded-xl px-4 h-9 bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
                disabled={isOnExpectedRoute && !isConditionMet}
              >
                {!isOnExpectedRoute
                  ? `Go to ${routeTab?.label ?? 'Tab'}`
                  : !isConditionMet
                    ? 'Wait...'
                    : isLast ? 'Finish' : 'Next'}
                {isOnExpectedRoute && isConditionMet && !isLast && <ArrowRight className="h-4 w-4 ml-1.5" />}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1 mt-4">
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-4 bg-orange-500' : i < currentStep ? 'w-1 bg-orange-200' : 'w-1 bg-stone-100'
                    }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
