import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import { Star, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';

interface Props {
  currentStep: number;
  totalSteps: number;
  timerRunning?: boolean;
  isDone?: boolean;
}

const CHEF_STATES = [
  { emoji: '👨‍🍳', label: 'Let\'s cook!', mood: 'ready' },
  { emoji: '🔪', label: 'Prep time!', mood: 'prep' },
  { emoji: '🥘', label: 'Getting hot!', mood: 'cook' },
  { emoji: '🍳', label: 'Sizzling!', mood: 'sizzle' },
  { emoji: '🥄', label: 'Stirring away...', mood: 'stir' },
  { emoji: '👃', label: 'Smells amazing!', mood: 'smell' },
  { emoji: '😋', label: 'Almost there!', mood: 'almost' },
  { emoji: '🎉', label: 'Masterpiece!', mood: 'done' },
];

const XP_PER_STEP = 15;

export function getLevel(xp: number): { level: number; current: number; needed: number } {
  let level = 1;
  let threshold = 50;
  let accumulated = 0;
  while (xp >= accumulated + threshold) {
    accumulated += threshold;
    level++;
    threshold = 50 + (level - 1) * 20;
  }
  return { level, current: xp - accumulated, needed: threshold };
}

/** Chef path only — shown at top of CookMode */
export function ChefPath({ currentStep, totalSteps, timerRunning, isDone }: Props) {
  const { chefAvatarUrl } = useStore();
  const state = useMemo(() => {
    if (isDone) return CHEF_STATES[CHEF_STATES.length - 1];
    if (timerRunning) return { emoji: '⏳', label: 'Cooking...', mood: 'wait' };
    const idx = Math.floor((currentStep / Math.max(totalSteps - 1, 1)) * (CHEF_STATES.length - 2));
    return CHEF_STATES[Math.min(idx, CHEF_STATES.length - 2)];
  }, [currentStep, totalSteps, timerRunning, isDone]);


  const progress = totalSteps > 1 ? currentStep / (totalSteps - 1) : 0;

  const milestones = useMemo(() => {
    if (totalSteps <= 2) return [];
    const dots: { pos: number; step: number; reached: boolean }[] = [];
    const interval = Math.max(1, Math.floor(totalSteps / 4));
    for (let i = interval; i < totalSteps - 1; i += interval) {
      dots.push({ pos: i / (totalSteps - 1), step: i, reached: currentStep >= i });
    }
    return dots;
  }, [totalSteps, currentStep]);

  return (
    <div className="space-y-1">
      <div className="relative w-full h-16 flex items-end">
        <div className="absolute bottom-3 left-4 right-4 h-2 rounded-full bg-muted/80" />
        <motion.div
          className="absolute bottom-3 left-4 h-2 rounded-full bg-gradient-to-r from-primary/80 to-primary"
          animate={{ width: `calc(${Math.min(progress, 1) * 100}% * (100% - 2rem) / 100%)` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          style={{ maxWidth: 'calc(100% - 2rem)' }}
        />

        {milestones.map((m, i) => (
          <motion.div
            key={i}
            className="absolute bottom-2"
            style={{ left: `calc(1rem + ${m.pos} * (100% - 2rem))` }}
            initial={false}
            animate={{ scale: m.reached ? [1, 1.4, 1] : 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${m.reached ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/30'
              }`}>
              {m.reached && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[8px]">⭐</motion.div>
              )}
            </div>
          </motion.div>
        ))}

        <div className="absolute bottom-2 text-lg" style={{ left: 'calc(100% - 1.5rem)' }}>🏁</div>
        <div className="absolute bottom-2 text-lg" style={{ left: '0.25rem' }}>🍽️</div>

        <motion.div
          className="absolute bottom-4"
          animate={{ left: `calc(1rem + ${Math.min(progress, 1)} * (100% - 4.5rem))` }}
          transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={state.emoji + state.mood}
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: [0, -6, 0],
                rotate: timerRunning ? [0, 2, -2, 0] : 0
              }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
                default: { duration: 0.3 }
              }}
              className="relative group cursor-default"
            >
              {chefAvatarUrl ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg scale-110 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img
                    src={chefAvatarUrl}
                    alt="Chef"
                    className="w-14 h-14 rounded-2xl border-2 border-white shadow-lg bg-orange-50 object-cover relative z-10"
                  />
                  {!isDone && (
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-stone-100 z-20">
                      <span className="text-xs">{state.emoji}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-4xl drop-shadow-md">{state.emoji}</div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

      </div>

      <div className="flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={state.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-xs font-bold text-muted-foreground tracking-wide"
          >
            {state.label}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** XP bar — shown at bottom of CookMode */
export function CookingXpBar({ currentStep, isDone }: { currentStep: number; isDone?: boolean }) {
  const { totalXp, addXp } = useStore();
  const [sessionXp, setSessionXp] = useState(0);
  const [xpPopup, setXpPopup] = useState<{ amount: number; id: number } | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!completedSteps.has(currentStep) && currentStep > 0) {
      const newCompleted = new Set(completedSteps);
      newCompleted.add(currentStep);
      setCompletedSteps(newCompleted);
      setSessionXp(prev => prev + XP_PER_STEP);
      addXp(XP_PER_STEP);
      setXpPopup({ amount: XP_PER_STEP, id: Date.now() });
    }
  }, [currentStep]);

  useEffect(() => {
    if (isDone && !completedSteps.has(-1)) {
      setSessionXp(prev => prev + 50);
      addXp(50);
      setXpPopup({ amount: 50, id: Date.now() });
      setCompletedSteps(prev => new Set(prev).add(-1));
    }
  }, [isDone]);

  useEffect(() => {
    if (xpPopup) {
      const t = setTimeout(() => setXpPopup(null), 1200);
      return () => clearTimeout(t);
    }
  }, [xpPopup]);

  const levelInfo = getLevel(totalXp);

  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex items-center gap-1">
        <motion.div animate={xpPopup ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        </motion.div>
        <span className="text-xs font-bold text-foreground">Lv.{levelInfo.level}</span>
      </div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
          animate={{ width: `${(levelInfo.current / levelInfo.needed) * 100}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>
      <div className="relative">
        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
          +{sessionXp} XP
        </span>
        <AnimatePresence>
          {xpPopup && (
            <motion.div
              key={xpPopup.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -24, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute -top-1 right-0 text-xs font-bold text-amber-500 whitespace-nowrap flex items-center gap-0.5 pointer-events-none"
            >
              <Zap className="h-3 w-3" />+{xpPopup.amount}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {isDone && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs font-bold text-amber-500">
          🎉 Bonus!
        </motion.span>
      )}
    </div>
  );
}

/** Legacy default export for backward compat */
export default function ChefCompanion(props: Props) {
  return (
    <div className="space-y-2">
      <ChefPath {...props} />
      <CookingXpBar currentStep={props.currentStep} isDone={props.isDone} />
    </div>
  );
}
