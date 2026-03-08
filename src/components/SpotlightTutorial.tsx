import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Home,
  UtensilsCrossed,
  Flame,
  Heart,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  Plus,
  Search,
} from 'lucide-react';

interface TutorialStep {
  route: string;
  target?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: 'above' | 'below' | 'center';
}

const ROUTE_TAB_TARGET: Record<string, { target: string; label: string }> = {
  '/dashboard': { target: 'nav-home', label: 'Home' },
  '/pantry': { target: 'nav-pantry', label: 'Pantry' },
  '/swipe': { target: 'nav-browse', label: 'Browse' },
  '/saved': { target: 'nav-recipes', label: 'Recipes' },
  '/grocery': { target: 'nav-grocery', label: 'Grocery' },
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    route: '/dashboard',
    title: 'Welcome to Munch! 🎉',
    description:
      'Your home dashboard shows stats at a glance and quick access to every feature. Let\'s take a tour!',
    icon: <Sparkles className="h-6 w-6" />,
    position: 'center',
  },
  {
    route: '/dashboard',
    target: 'stats',
    title: 'Your Stats',
    description:
      'Track your pantry items, saved recipes, and total available recipes right here.',
    icon: <Home className="h-5 w-5" />,
  },
  {
    route: '/pantry',
    target: 'pantry-add-form',
    title: 'Add Ingredients',
    description:
      'Type an ingredient and tap + to add it. Munch auto-detects the category and will match recipes to what you have!',
    icon: <Plus className="h-5 w-5" />,
  },
  {
    route: '/pantry',
    target: 'pantry-quick-add',
    title: 'Quick Add',
    description:
      'Tap common ingredients to add them instantly. Great for stocking up your virtual pantry fast!',
    icon: <UtensilsCrossed className="h-5 w-5" />,
  },
  {
    route: '/swipe',
    target: 'swipe-search',
    title: 'Search Recipes',
    description:
      'Search by name, ingredient, or even paste a URL to import a recipe from the web.',
    icon: <Search className="h-5 w-5" />,
  },
  {
    route: '/swipe',
    target: 'swipe-card-area',
    title: 'Swipe to Discover',
    description:
      'Swipe right to save a recipe, left to skip. Recipes are ranked by how well they match your pantry and taste!',
    icon: <Flame className="h-5 w-5" />,
  },
  {
    route: '/saved',
    target: 'saved-header',
    title: 'Your Saved Recipes',
    description:
      'All recipes you liked land here. Tap to expand details, see ingredient match %, and start cooking!',
    icon: <Heart className="h-5 w-5" />,
  },
  {
    route: '/saved',
    target: 'saved-actions',
    title: 'Create & Import',
    description:
      'Create your own recipes or import them from any URL. Add missing ingredients to your grocery list with one tap.',
    icon: <Plus className="h-5 w-5" />,
  },
  {
    route: '/grocery',
    target: 'grocery-header',
    title: 'Smart Grocery List',
    description:
      'Missing ingredients are auto-grouped by aisle. Export to Apple Notes or Google Docs for easy shopping!',
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    route: '/dashboard',
    title: 'You\'re all set! 🚀',
    description:
      'Start by adding items to your pantry, then browse recipes to find your next meal. Happy cooking!',
    icon: <Sparkles className="h-6 w-6" />,
    position: 'center',
  },
];

interface SpotlightTutorialProps {
  onComplete: () => void;
}

export default function SpotlightTutorial({ onComplete }: SpotlightTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(280);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const step = TUTORIAL_STEPS[currentStep];
  const pad = 8;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const isOnExpectedRoute = location.pathname === step.route;
  const routeTab = ROUTE_TAB_TARGET[step.route];
  const activeTarget = isOnExpectedRoute ? step.target : routeTab?.target;
  const stepDescription = isOnExpectedRoute
    ? step.description
    : routeTab
      ? `Tap ${routeTab.label} in the bottom tabs to continue.`
      : step.description;

  useEffect(() => {
    if (!tooltipRef.current) return;

    const measure = () => {
      if (tooltipRef.current) {
        setTooltipHeight(tooltipRef.current.offsetHeight || 280);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tooltipRef.current);
    return () => observer.disconnect();
  }, [currentStep, location.pathname]);

  const updateSpotlight = useCallback(() => {
    if (!activeTarget) {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(`[data-tutorial="${activeTarget}"]`);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [activeTarget]);

  useEffect(() => {
    const timers = [50, 180, 360, 700].map((ms) => setTimeout(updateSpotlight, ms));
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [updateSpotlight]);

  const next = () => {
    if (!isOnExpectedRoute) return;

    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => {
    navigate('/dashboard');
    onComplete();
  };

  const getTooltipStyle = (): React.CSSProperties => {
    const topPadding = 16;
    const bottomPadding = 96;
    const maxTop = Math.max(topPadding, window.innerHeight - tooltipHeight - bottomPadding);

    if (step.position === 'center' || !spotlightRect) {
      const centeredTop = (window.innerHeight - tooltipHeight) / 2;
      return { top: `${Math.min(Math.max(centeredTop, topPadding), maxTop)}px` };
    }

    const placeAbove = spotlightRect.top > window.innerHeight * 0.52;
    const preferredTop = placeAbove
      ? spotlightRect.top - tooltipHeight - pad - 16
      : spotlightRect.bottom + pad + 16;

    const clampedTop = Math.min(Math.max(preferredTop, topPadding), maxTop);
    return { top: `${clampedTop}px` };
  };

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left - pad}
                y={spotlightRect.top - pad}
                width={spotlightRect.width + pad * 2}
                height={spotlightRect.height + pad * 2}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {spotlightRect && (
        <motion.div
          layoutId="spotlight-ring"
          className="absolute border-2 border-primary rounded-xl pointer-events-none"
          style={{
            left: spotlightRect.left - pad,
            top: spotlightRect.top - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
          }}
          transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute left-4 right-4 max-w-sm mx-auto z-[102]"
          style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
          ref={tooltipRef}
        >
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xl max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {step.icon}
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-base">{step.title}</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {currentStep + 1} of {TUTORIAL_STEPS.length}
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{stepDescription}</p>

            <div className="flex items-center justify-between">
              <button
                onClick={skip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tutorial
              </button>
              <Button onClick={next} size="sm" className="gap-1.5" disabled={!isOnExpectedRoute}>
                {isOnExpectedRoute ? (isLast ? "Let's Cook!" : 'Next') : `Go to ${routeTab?.label ?? 'tab'}`}
                {isOnExpectedRoute && !isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-3">
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-4 bg-primary'
                      : i < currentStep
                        ? 'w-1.5 bg-primary/40'
                        : 'w-1.5 bg-muted'
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

