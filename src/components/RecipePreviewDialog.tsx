import { useNavigate } from 'react-router-dom';
import type { Recipe } from '@/data/recipes';
import type { MatchResult } from '@/lib/matchLogic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart3, Check, ShoppingCart, MapPin, ChefHat } from 'lucide-react';

interface Props {
  recipe: Recipe | null;
  match: MatchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chefName?: string | null;
  chefId?: string | null;
}

export default function RecipePreviewDialog({ recipe, match, open, onOpenChange, chefName, chefId }: Props) {
  const navigate = useNavigate();
  if (!recipe || !match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden">
        <div className="relative h-48 overflow-hidden">
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">{recipe.name}</DialogTitle>
              {chefName && chefId && (
                <button
                  onClick={() => { onOpenChange(false); navigate(`/chef/${chefId}`); }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline w-fit"
                >
                  <ChefHat className="h-3 w-3" /> by {chefName}
                </button>
              )}
            </DialogHeader>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] px-4 pb-4">
          <div className="space-y-4">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> {recipe.cook_time}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <BarChart3 className="h-3 w-3" /> {recipe.difficulty}
              </Badge>
              <Badge variant="outline" className="font-bold">{match.percentage}% match</Badge>
              {recipe.cuisine && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" /> {recipe.cuisine}
                </Badge>
              )}
            </div>

            {/* Tags */}
            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Ingredients */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingredients</p>
              <div className="flex flex-wrap gap-1.5">
                {match.matched.map(ing => (
                  <span key={ing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
                    <Check className="h-3 w-3" />{ing}
                  </span>
                ))}
                {match.missing.map(ing => (
                  <span key={ing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                    <ShoppingCart className="h-3 w-3" />{ing}
                  </span>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {recipe.instructions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Instructions</p>
                <ol className="space-y-2">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
