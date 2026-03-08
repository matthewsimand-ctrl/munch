import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Clock, BarChart3, Check, ShoppingCart, MapPin, ChefHat, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '@/data/recipes';
import type { MatchResult } from '@/lib/matchLogic';

interface SwipeCardProps {
  recipe: Recipe;
  match: MatchResult;
  onSwipe: (dir: 'left' | 'right') => void;
  onImageTap?: () => void;
  isTop: boolean;
  chefName?: string | null;
  chefId?: string | null;
}

export default function SwipeCard({ recipe, match, onSwipe, onImageTap, isTop, chefName, chefId }: SwipeCardProps) {
  const navigate = useNavigate();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [0, 80], [0, 1]);
  const nopeOpacity = useTransform(x, [-80, 0], [1, 0]);
  const isDragging = useRef(false);
  const [swiped, setSwiped] = useState(false);

  const borderColor =
    match.status === 'perfect' ? 'border-success' :
    match.status === 'almost' ? 'border-warning' : 'border-border';

  const badgeBg =
    match.status === 'perfect' ? 'bg-success text-success-foreground' :
    match.status === 'almost' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground';

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 80;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Use both offset and velocity for responsive feel
    if (offset > threshold || velocity > 500) {
      setSwiped(true);
      onSwipe('right');
    } else if (offset < -threshold || velocity < -500) {
      setSwiped(true);
      onSwipe('left');
    }

    // Reset dragging flag after a tick
    requestAnimationFrame(() => { isDragging.current = false; });
  };

  const handleTap = () => {
    if (!isDragging.current && onImageTap) {
      onImageTap();
    }
  };

  if (!isTop) {
    // Background card: static, no animation, slightly scaled down
    return (
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <div
          className={`h-full rounded-2xl border-2 ${borderColor} bg-card shadow-md overflow-hidden flex flex-col`}
          style={{ transform: 'scale(0.97)', transformOrigin: 'center bottom', opacity: 0.7 }}
        >
          <div className="relative h-56 bg-muted overflow-hidden flex-shrink-0">
            <img
              src={recipe.image}
              alt={recipe.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className={`absolute bottom-3 right-3 ${badgeBg} px-3 py-1.5 rounded-full text-sm font-bold shadow-md`}>
              {match.percentage}% Match
            </div>
          </div>
          <div className="flex-1 p-5 flex flex-col">
            <h2 className="font-display text-xl font-bold text-card-foreground mb-1">
              {recipe.name}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing"
      style={{ x, rotate, zIndex: 10 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      exit={{
        x: x.get() > 0 ? 300 : -300,
        opacity: 0,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
    >
      <div
        className={`h-full rounded-2xl border-2 ${borderColor} bg-card shadow-lg overflow-hidden flex flex-col`}
        onClick={handleTap}
      >
        {/* Image */}
        <div className="relative h-56 bg-muted overflow-hidden flex-shrink-0">
          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-full object-cover"
            draggable={false}
            loading="lazy"
          />
          {/* Swipe feedback overlays */}
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
          {/* Match badge */}
          <div className={`absolute bottom-3 right-3 ${badgeBg} px-3 py-1.5 rounded-full text-sm font-bold shadow-md`}>
            {match.percentage}% Match
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          <h2 className="font-display text-xl font-bold text-card-foreground mb-1">
            {recipe.name}
          </h2>
          {chefName && chefId && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/chef/${chefId}`); }}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2"
            >
              <ChefHat className="h-3 w-3" /> by {chefName}
            </button>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {recipe.cook_time}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" /> {recipe.difficulty}
            </span>
            {recipe.cuisine && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {recipe.cuisine}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {recipe.servings}
              </span>
            )}
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
