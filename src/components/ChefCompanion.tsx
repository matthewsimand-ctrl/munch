import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface Props {
  currentStep: number;
  totalSteps: number;
  timerRunning?: boolean;
  isDone?: boolean;
}

const CHEF_STATES = [
  { emoji: '👨‍🍳', label: 'Ready!' },
  { emoji: '🔪', label: 'Prepping...' },
  { emoji: '🥘', label: 'Cooking...' },
  { emoji: '🍳', label: 'Sizzling...' },
  { emoji: '🥄', label: 'Stirring...' },
  { emoji: '👃', label: 'Smells great!' },
  { emoji: '😋', label: 'Almost there!' },
  { emoji: '🎉', label: 'Done!' },
];

export default function ChefCompanion({ currentStep, totalSteps, timerRunning, isDone }: Props) {
  const state = useMemo(() => {
    if (isDone) return { emoji: '🎉', label: 'Bon appétit!' };
    if (timerRunning) return { emoji: '⏳', label: 'Waiting...' };
    const idx = Math.floor((currentStep / Math.max(totalSteps - 1, 1)) * (CHEF_STATES.length - 2));
    return CHEF_STATES[Math.min(idx, CHEF_STATES.length - 2)];
  }, [currentStep, totalSteps, timerRunning, isDone]);

  const progress = totalSteps > 0 ? currentStep / (totalSteps - 1) : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Chef track */}
      <div className="relative w-full h-12 flex items-end">
        {/* Track line */}
        <div className="absolute bottom-1 left-4 right-4 h-1 rounded-full bg-muted" />
        <div
          className="absolute bottom-1 left-4 h-1 rounded-full bg-primary transition-all duration-500"
          style={{ width: `calc(${Math.min(progress, 1) * 100}% * (100% - 2rem) / 100%)`, maxWidth: 'calc(100% - 2rem)' }}
        />

        {/* Animated chef */}
        <motion.div
          className="absolute bottom-2"
          animate={{ left: `calc(1rem + ${Math.min(progress, 1) * 100}% * (100% - 3rem) / 100%)` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ left: `calc(1rem + ${Math.min(progress, 1)} * (100% - 3rem))` }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={state.emoji}
              initial={{ scale: 0.5, y: 10 }}
              animate={{
                scale: 1,
                y: [0, -6, 0],
              }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{
                scale: { duration: 0.2 },
                y: { duration: 0.6, repeat: timerRunning ? Infinity : 0, repeatType: 'loop' },
              }}
              className="text-3xl select-none"
            >
              {state.emoji}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={state.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-xs font-semibold text-muted-foreground"
        >
          {state.label}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
