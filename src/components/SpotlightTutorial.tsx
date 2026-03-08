import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  UtensilsCrossed,
  Flame,
  Heart,
  ShoppingCart,
  CalendarDays,
  Settings,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';

export interface TutorialStep {
  target: string; // data-tutorial attribute value
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: 'stats',
    title: 'Your Dashboard',
    description:
      'Track your pantry items, saved recipes, and available dishes at a glance.',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    target: 'action-browse',
    title: 'Browse Recipes',
    description:
      'Swipe through personalized recipe suggestions based on your preferences and pantry.',
    icon: <Flame className="h-5 w-5" />,
  },
  {
    target: 'action-pantry',
    title: 'My Pantry',
    description:
      'Add ingredients you have at home. We\'ll match recipes to what you\'ve got.',
    icon: <UtensilsCrossed className="h-5 w-5" />,
  },
  {
    target: 'action-saved',
    title: 'Saved Recipes',
    description:
      'Your liked recipes live here. Add missing ingredients to your grocery list with one tap.',
    icon: <Heart className="h-5 w-5" />,
  },
  {
    target: 'action-mealprep',
    title: 'Meal Prep',
    description:
      'Plan your week by dragging saved recipes into a meal calendar.',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    target: 'nav-grocery',
    title: 'Grocery List',
    description:
      'Missing ingredients are grouped by aisle. Check items off as you shop.',
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    target: 'settings-btn',
    title: 'Settings',
    description:
      'Update your preferences, redo onboarding, or adjust your default servings anytime.',
    icon: <Settings className="h-5 w-5" />,
  },
];

interface SpotlightTutorialProps {
  onComplete: () => void;
}

export default function SpotlightTutorial({ onComplete }: SpotlightTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const step = TUTORIAL_STEPS[currentStep];

  const updateSpotlight = useCallback(() => {
    const el = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    // Small delay so layout is settled
    const timer = setTimeout(updateSpotlight, 150);
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      clearTimeout(timer);
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

  const skip = () => onComplete();

  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const pad = 8;

  // Position tooltip below or above the spotlight
  const tooltipTop = spotlightRect
    ? spotlightRect.bottom + pad + 12 > window.innerHeight * 0.7
      ? spotlightRect.top - pad - 12 // show above
      : spotlightRect.bottom + pad + 12 // show below
    : '50%';

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dimmed overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left - pad}
                y={spotlightRect.top - pad}
                width={spotlightRect.width + pad * 2}
                height={spotlightRect.height + pad * 2}
                rx="12"
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
          className="absolute left-4 right-4 max-w-sm mx-auto z-[101]"
          style={{ top: tooltipTop }}
        >
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {step.icon}
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-base">{step.title}</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Step {currentStep + 1} of {TUTORIAL_STEPS.length}
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
                {isLast ? 'Get Started' : 'Next'}
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
