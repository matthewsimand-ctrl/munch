import { useState, useEffect, useCallback } from 'react';
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
  CalendarDays,
} from 'lucide-react';

interface TutorialStep {
  route: string; // which route to be on
  target?: string; // data-tutorial attribute value to spotlight
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: 'above' | 'below' | 'center';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // Dashboard intro
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
  // Pantry page
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
  // Browse / Swipe page
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
  // Saved Recipes page
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
  // Grocery page
  {
    route: '/grocery',
    target: 'grocery-header',
    title: 'Smart Grocery List',
    description:
      'Missing ingredients are auto-grouped by aisle. Export to Apple Notes or Google Docs for easy shopping!',
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  // Final
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
  const [navigating, setNavigating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const step = TUTORIAL_STEPS[currentStep];

  // Navigate to the correct route for the current step
  useEffect(() => {
    if (location.pathname !== step.route) {
      setNavigating(true);
      navigate(step.route);
    }
  }, [currentStep, step.route, location.pathname, navigate]);

  // After navigation completes, mark navigating done
  useEffect(() => {
    if (navigating && location.pathname === step.route) {
      const timer = setTimeout(() => setNavigating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [navigating, location.pathname, step.route]);

  const updateSpotlight = useCallback(() => {
    if (!step.target || navigating) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [step.target, navigating]);

  useEffect(() => {
    // Retry a few times for elements that render after route change
    const timers = [150, 400, 800].map((ms) =>
      setTimeout(updateSpotlight, ms)
    );
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [updateSpotlight]);

  const next = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => {
    // Navigate back to dashboard before completing
    navigate('/dashboard');
    onComplete();
  };

  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const pad = 8;

  const getTooltipStyle = (): React.CSSProperties => {
    if (step.position === 'center' || !spotlightRect) {
      return { top: '50%', transform: 'translateY(-50%)' };
    }
    // If target is in the bottom half, show above
    if (spotlightRect.top > window.innerHeight * 0.5) {
      return { bottom: window.innerHeight - spotlightRect.top + pad + 16 };
    }
    // Otherwise show below
    return { top: spotlightRect.bottom + pad + 16 };
  };

  if (navigating) return null;

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
      {/* Dimmed overlay with cutout */}
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

      {/* Spotlight border ring */}
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
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="absolute left-4 right-4 max-w-sm mx-auto z-[102]"
          style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
        >
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xl">
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
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {step.description}
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={skip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tutorial
              </button>
              <Button onClick={next} size="sm" className="gap-1.5">
                {isLast ? "Let's Cook!" : 'Next'}
                {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {/* Progress dots */}
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
