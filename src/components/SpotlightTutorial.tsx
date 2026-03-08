import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

interface TutorialStep {
  type: 'fullscreen' | 'spotlight';
  target?: string; // data-tutorial attribute value
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: 'tap'; // if set, user must tap the highlighted element to proceed
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    type: 'fullscreen',
    title: 'Welcome to Munch! 🎉',
    description:
      'This is your home dashboard. It shows your stats at a glance and gives you quick access to every feature. Let\'s walk through the tabs at the bottom.',
    icon: <Sparkles className="h-6 w-6" />,
  },
  {
    type: 'spotlight',
    target: 'nav-home',
    title: 'Home',
    description:
      'You\'re here! Your dashboard shows pantry count, saved recipes, and quick actions to jump anywhere.',
    icon: <Home className="h-5 w-5" />,
  },
  {
    type: 'spotlight',
    target: 'nav-pantry',
    title: 'Pantry',
    description:
      'Add ingredients you have at home. Munch will match recipes to what\'s in your pantry. Tap to explore!',
    icon: <UtensilsCrossed className="h-5 w-5" />,
    action: 'tap',
  },
  {
    type: 'spotlight',
    target: 'nav-browse',
    title: 'Browse Recipes',
    description:
      'Swipe through personalized recipe suggestions tailored to your tastes and dietary needs. Tap to explore!',
    icon: <Flame className="h-5 w-5" />,
    action: 'tap',
  },
  {
    type: 'spotlight',
    target: 'nav-recipes',
    title: 'Saved Recipes',
    description:
      'Recipes you like land here. You can add missing ingredients to your grocery list with one tap. Tap to explore!',
    icon: <Heart className="h-5 w-5" />,
    action: 'tap',
  },
  {
    type: 'spotlight',
    target: 'nav-grocery',
    title: 'Grocery List',
    description:
      'Missing ingredients are grouped by aisle so shopping is a breeze. Tap to explore!',
    icon: <ShoppingCart className="h-5 w-5" />,
    action: 'tap',
  },
  {
    type: 'fullscreen',
    title: 'You\'re all set! 🚀',
    description:
      'Start by adding items to your pantry, then browse recipes to find your next meal. Happy cooking!',
    icon: <Sparkles className="h-6 w-6" />,
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
    if (step.type !== 'spotlight' || !step.target) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [step.target, step.type]);

  useEffect(() => {
    const timer = setTimeout(updateSpotlight, 150);
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [updateSpotlight]);

  // For 'tap' action steps, allow clicking through the spotlight to the target element
  useEffect(() => {
    if (step.action !== 'tap' || !step.target) return;

    const handleClick = (e: MouseEvent) => {
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      if (el && el.contains(e.target as Node)) {
        // Let the click go through, then advance after a short delay
        setTimeout(() => {
          if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
          } else {
            onComplete();
          }
        }, 400);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [step.action, step.target, currentStep, onComplete]);

  const next = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => onComplete();

  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const pad = 6;

  // Tooltip positioning: for bottom nav items, show ABOVE; otherwise center or below
  const getTooltipStyle = (): React.CSSProperties => {
    if (step.type === 'fullscreen' || !spotlightRect) {
      return { top: '50%', transform: 'translateY(-50%)' };
    }
    // If target is in the bottom 20% of screen, show tooltip above it
    if (spotlightRect.top > window.innerHeight * 0.7) {
      return { bottom: window.innerHeight - spotlightRect.top + pad + 16 };
    }
    // Otherwise show below
    return { top: spotlightRect.bottom + pad + 16 };
  };

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
          fill="rgba(0,0,0,0.65)"
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
              {step.action === 'tap' ? (
                <span className="text-xs font-medium text-primary animate-pulse">
                  👆 Tap the tab to continue
                </span>
              ) : (
                <Button onClick={next} size="sm" className="gap-1.5">
                  {isLast ? "Let's Cook!" : 'Next'}
                  {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
                </Button>
              )}
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
