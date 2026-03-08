import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Clock, BarChart3, Check, ShoppingCart } from 'lucide-react';
import type { Recipe } from '@/data/recipes';
import type { MatchResult } from '@/lib/matchLogic';

interface SwipeCardProps {
  recipe: Recipe;
  match: MatchResult;
  onSwipe: (dir: 'left' | 'right') => void;
  isTop: boolean;
}

export default function SwipeCard({ recipe, match, onSwipe, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const borderColor =
    match.status === 'perfect' ? 'border-success' :
    match.status === 'almost' ? 'border-warning' : 'border-border';

  const badgeBg =
    match.status === 'perfect' ? 'bg-success text-success-foreground' :
    match.status === 'almost' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground';

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) onSwipe('right');
    else if (info.offset.x < -100) onSwipe('left');
  };

  return (
    <motion.div
      className={`absolute inset-0 cursor-grab active:cursor-grabbing`}
      style={{ x, rotate, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02 }}
      exit={{ x: x.get() > 0 ? 400 : -400, opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className={`h-full rounded-2xl border-2 ${borderColor} bg-card shadow-lg overflow-hidden flex flex-col`}>
        {/* Image */}
        <div className="relative h-56 bg-muted overflow-hidden flex-shrink-0">
          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Swipe feedback overlays */}
          {isTop && (
            <>
              <motion.div
                className="absolute top-4 left-4 bg-success text-success-foreground px-4 py-2 rounded-lg font-bold text-lg rotate-[-12deg] border-2 border-success"
                style={{ opacity: likeOpacity }}
              >
                SAVE
              </motion.div>
              <motion.div
                className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-bold text-lg rotate-[12deg] border-2 border-destructive"
                style={{ opacity: nopeOpacity }}
              >
                NOPE
              </motion.div>
            </>
          )}
          {/* Match badge */}
          <div className={`absolute bottom-3 right-3 ${badgeBg} px-3 py-1.5 rounded-full text-sm font-bold shadow-md`}>
            {match.percentage}% Match
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          <h2 className="font-display text-xl font-bold text-card-foreground mb-2">
            {recipe.name}
          </h2>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {recipe.cookTime}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" /> {recipe.difficulty}
            </span>
          </div>

          {/* Ingredient status */}
          <div className="flex-1 space-y-2 overflow-auto">
            {match.matched.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {match.matched.slice(0, 4).map((ing) => (
                  <span
                    key={ing}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium"
                  >
                    <Check className="h-3 w-3" /> {ing}
                  </span>
                ))}
                {match.matched.length > 4 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">
                    +{match.matched.length - 4} more
                  </span>
                )}
              </div>
            )}
            {match.missing.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {match.missing.map((ing) => (
                  <span
                    key={ing}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium"
                  >
                    <ShoppingCart className="h-3 w-3" /> {ing}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
