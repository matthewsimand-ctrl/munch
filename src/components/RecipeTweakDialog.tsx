import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Loader2, Leaf, ShoppingBasket, Heart, ChefHat, MessageSquare, ArrowRight, X, Save, Lock } from 'lucide-react';
import { getAiDisabledMessage, isAiAgentCallsDisabledError } from '@/lib/ai';
import { invokeAppFunction } from '@/lib/functionClient';
import { toast } from 'sonner';
import type { Recipe } from '@/data/recipes';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';

interface Props {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TweakType = 'dietary' | 'pantry' | 'healthier' | 'simpler' | 'custom';

const TWEAK_OPTIONS: { type: TweakType; label: string; description: string; icon: typeof Leaf }[] = [
  { type: 'dietary', label: 'Dietary', description: 'Adapt to your dietary needs', icon: Leaf },
  { type: 'pantry', label: 'Use My Pantry', description: 'Swap with what you have', icon: ShoppingBasket },
  { type: 'healthier', label: 'Healthier', description: 'Lower calories & more nutrients', icon: Heart },
  { type: 'simpler', label: 'Simplify', description: 'Fewer steps & ingredients', icon: ChefHat },
  { type: 'custom', label: 'Custom', description: 'Tell the AI what to change', icon: MessageSquare },
];

export default function RecipeTweakDialog({ recipe, open, onOpenChange }: Props) {
  const { userProfile, pantryList, likeRecipe } = useStore();
  const { isPremium } = usePremiumAccess();
  const [tweakType, setTweakType] = useState<TweakType | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; ingredients: string[]; instructions: string[]; changes_summary: string } | null>(null);

  const handleTweak = async () => {
    if (!tweakType) return;
    if (!isPremium) {
      toast.info('AI Recipe Tweaker is a Premium feature.');
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await invokeAppFunction('tweak-recipe', {
        body: {
          recipeName: recipe.name,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          tweakType,
          dietaryRestrictions: userProfile.dietaryRestrictions,
          pantryItems: pantryList.map(p => p.name),
          customPrompt: tweakType === 'custom' ? customPrompt : undefined,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed');

      setResult(data.tweaked);
    } catch (e: any) {
      if (isAiAgentCallsDisabledError(e)) {
        toast.info(getAiDisabledMessage('AI recipe tweaks'));
        return;
      }

      toast.error(e.message || 'Failed to tweak recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTweakType(null);
    setResult(null);
    setCustomPrompt('');
  };

  const handleSaveTweakedRecipe = () => {
    if (!result) return;
    const recipeId = `tweaked-${recipe.id}-${Date.now()}`;
    likeRecipe(recipeId, {
      ...recipe,
      id: recipeId,
      name: result.name,
      ingredients: result.ingredients,
      instructions: result.instructions,
      source: 'tweaked',
    });
    toast.success('Tweaked recipe saved locally');
    onOpenChange(false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) handleReset(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Recipe Tweaker
            {!isPremium && <Badge variant="secondary" className="ml-2"><Lock className="h-3 w-3 mr-1" /> Premium</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="space-y-4 pr-2">
            <p className="text-sm text-muted-foreground">
              Tweak <span className="font-semibold text-foreground">{recipe.name}</span> with AI
            </p>

            {!result ? (
              <>
                {/* Tweak type selection */}
                <div className="grid grid-cols-2 gap-2">
                  {TWEAK_OPTIONS.map(({ type, label, description, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => setTweakType(type)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tweakType === type
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-1 ${tweakType === type ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-sm font-semibold text-foreground">{label}</div>
                      <div className="text-[10px] text-muted-foreground">{description}</div>
                    </button>
                  ))}
                </div>

                {tweakType === 'dietary' && userProfile.dietaryRestrictions.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1.5">Your dietary restrictions:</p>
                    <div className="flex flex-wrap gap-1">
                      {userProfile.dietaryRestrictions.map(d => (
                        <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {tweakType === 'pantry' && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Using {pantryList.length} pantry items for swaps
                    </p>
                  </div>
                )}

                {tweakType === 'custom' && (
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Make it spicier, add more protein, use air fryer instead..."
                    rows={3}
                  />
                )}

                <Button
                  onClick={handleTweak}
                  disabled={!isPremium || !tweakType || loading || (tweakType === 'custom' && !customPrompt.trim())}
                  className="w-full"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Tweaking...</>
                  ) : (
                    <>{isPremium ? <Wand2 className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}{isPremium ? 'Tweak Recipe' : 'Premium Required'}</>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Result */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-semibold text-foreground mb-1">{result.name}</p>
                  <p className="text-xs text-muted-foreground">{result.changes_summary}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Modified Ingredients
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.ingredients.map((ing, i) => {
                      const isNew = !recipe.ingredients.some(
                        orig => orig.toLowerCase() === ing.toLowerCase()
                      );
                      return (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            isNew
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isNew && <ArrowRight className="inline h-3 w-3 mr-0.5" />}
                          {ing}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Modified Instructions
                  </p>
                  <ol className="space-y-2">
                    {result.instructions.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset} className="flex-1">
                    <X className="h-4 w-4 mr-1" /> Try Again
                  </Button>
                  <Button onClick={handleSaveTweakedRecipe} className="flex-1">
                    <Save className="h-4 w-4 mr-1" /> Save Locally
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
