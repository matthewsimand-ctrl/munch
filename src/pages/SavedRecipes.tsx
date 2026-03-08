import { useState, useMemo, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { calculateMatch } from '@/lib/matchLogic';
import { classifyMealType } from '@/lib/mealClassifier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Clock, BarChart3, Check, ShoppingCart, ChevronDown, ChevronUp, Play, Plus, Trash2, Users,
  FolderPlus, Folder, FolderOpen, X, Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import CreateRecipeForm from '@/components/CreateRecipeForm';
import ImportRecipeDialog from '@/components/ImportRecipeDialog';
import NutritionCard from '@/components/NutritionCard';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';

const MEAL_TAGS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const TAG_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  lunch: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  dinner: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  snack: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

export default function SavedRecipes() {
  const navigate = useNavigate();
  const {
    likedRecipes, pantryList, unlikeRecipe, savedApiRecipes, groceryRecipes,
    addToGrocery, removeFromGrocery, recipeMealTags, setRecipeMealTag,
    recipeFolders, createFolder, renameFolder, deleteFolder, addRecipeToFolder, removeRecipeFromFolder,
  } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = "All"
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [folderAssignRecipe, setFolderAssignRecipe] = useState<string | null>(null);
  const { data: dbRecipes = [] } = useDbRecipes();

  const pantryNames = useMemo(() => pantryList.map(p => p.name), [pantryList]);

  // Auto-classify recipes that don't have a tag yet
  const saved = useMemo(() => {
    return likedRecipes
      .map((id) => {
        const recipe = dbRecipes.find((r) => r.id === id) || savedApiRecipes[id];
        if (!recipe) return null;
        return { recipe, match: calculateMatch(pantryNames, recipe.ingredients), source: (recipe as any).source };
      })
      .filter(Boolean) as { recipe: any; match: ReturnType<typeof calculateMatch>; source?: string }[];
  }, [likedRecipes, pantryNames, savedApiRecipes, dbRecipes]);

  // Auto-tag on mount for any untagged recipes
  useEffect(() => {
    saved.forEach(({ recipe }) => {
      if (!recipeMealTags[recipe.id]) {
        const tag = classifyMealType(recipe);
        setRecipeMealTag(recipe.id, tag);
      }
    });
  }, [saved, recipeMealTags, setRecipeMealTag]);

  const grocerySet = useMemo(() => new Set(groceryRecipes), [groceryRecipes]);

  // Filter by folder
  const filteredSaved = useMemo(() => {
    if (!activeFolder) return saved;
    const folder = recipeFolders.find(f => f.id === activeFolder);
    if (!folder) return saved;
    const idSet = new Set(folder.recipeIds);
    return saved.filter(s => idSet.has(s.recipe.id));
  }, [saved, activeFolder, recipeFolders]);

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    createFolder(trimmed);
    setNewFolderName('');
    toast.success(`Folder "${trimmed}" created`);
  };

  const handleRename = (folderId: string) => {
    const trimmed = renameText.trim();
    if (!trimmed) return;
    renameFolder(folderId, trimmed);
    setRenamingFolder(null);
    setRenameText('');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-8 pb-2 max-w-2xl mx-auto w-full">
        <PageHeader title="Recipes">
          <span className="text-sm text-muted-foreground font-medium">{saved.length} saved</span>
        </PageHeader>

        {/* Action row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap" data-tutorial="saved-actions">
          <ImportRecipeDialog />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default">
                <Plus className="h-4 w-4 mr-1" /> Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Create Recipe</DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto pr-2 pl-1 pb-2">
                <CreateRecipeForm onClose={() => setCreateOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => navigate('/grocery')}>
            <ShoppingCart className="h-4 w-4 mr-1" /> Grocery
          </Button>
        </div>

        {/* Folders bar */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFolder(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              activeFolder === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({saved.length})
          </button>
          {recipeFolders.map((folder) => {
            const count = saved.filter(s => folder.recipeIds.includes(s.recipe.id)).length;
            const isActive = activeFolder === folder.id;
            return (
              <div key={folder.id} className="relative group flex items-center">
                {renamingFolder === folder.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRename(folder.id); }}
                    className="flex items-center gap-1"
                  >
                    <Input
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      className="h-7 w-24 text-xs"
                      autoFocus
                      onBlur={() => setRenamingFolder(null)}
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => setActiveFolder(isActive ? null : folder.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isActive ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
                    {folder.name} ({count})
                  </button>
                )}
                {/* Folder actions on hover */}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => { setRenamingFolder(folder.id); setRenameText(folder.name); }}
                    className="text-muted-foreground hover:text-foreground"
                    title="Rename"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => { deleteFolder(folder.id); if (activeFolder === folder.id) setActiveFolder(null); }}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete folder"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
          {/* New folder input */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                <FolderPlus className="h-3 w-3" /> New Folder
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }} className="flex gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="h-8 text-sm"
                />
                <Button type="submit" size="sm" className="h-8">Add</Button>
              </form>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto w-full space-y-3 pb-8 mt-4">
        {filteredSaved.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              {activeFolder ? 'No recipes in this folder yet.' : 'No saved recipes yet. Start swiping!'}
            </p>
            {activeFolder ? (
              <Button variant="outline" onClick={() => setActiveFolder(null)}>View All Recipes</Button>
            ) : (
              <Button onClick={() => navigate('/swipe')}>Go to Browse</Button>
            )}
          </div>
        ) : (
          filteredSaved.map(({ recipe, match }) => {
            const expanded = expandedId === recipe.id;
            const isInGrocery = grocerySet.has(recipe.id);
            const mealTag = recipeMealTags[recipe.id] || 'dinner';
            const borderColor =
              match.status === 'perfect' ? 'border-success' :
              match.status === 'almost' ? 'border-warning' : 'border-border';

            return (
              <motion.div
                key={recipe.id}
                layout
                className={`rounded-xl border-2 ${borderColor} bg-card overflow-hidden shadow-sm relative`}
              >
                {/* Quick delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); unlikeRecipe(recipe.id); }}
                  className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive flex items-center justify-center transition-colors"
                  title="Remove recipe"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setExpandedId(expanded ? null : recipe.id)}
                  className="w-full flex items-center gap-3 p-3 pr-10 text-left"
                >
                  <img src={recipe.image} alt={recipe.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-card-foreground truncate">{recipe.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[mealTag] || TAG_COLORS.dinner}`}>
                        {mealTag}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.cook_time}</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{recipe.difficulty}</span>
                      {recipe.servings && (
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{recipe.servings}</span>
                      )}
                      <span className="font-semibold text-primary">{match.percentage}%</span>
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4">
                        {/* Meal tag + folder controls */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Meal:</span>
                            <Select value={mealTag} onValueChange={(v) => setRecipeMealTag(recipe.id, v)}>
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MEAL_TAGS.map(t => (
                                  <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {recipeFolders.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Folder:</span>
                              <Select
                                value={recipeFolders.find(f => f.recipeIds.includes(recipe.id))?.id || '_none'}
                                onValueChange={(v) => {
                                  // Remove from all folders first
                                  recipeFolders.forEach(f => {
                                    if (f.recipeIds.includes(recipe.id)) removeRecipeFromFolder(f.id, recipe.id);
                                  });
                                  if (v !== '_none') addRecipeToFolder(v, recipe.id);
                                }}
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none" className="text-xs">None</SelectItem>
                                  {recipeFolders.map(f => (
                                    <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* Ingredients */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingredients</p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.matched.map((ing) => (
                              <span key={ing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
                                <Check className="h-3 w-3" />{ing}
                              </span>
                            ))}
                            {match.missing.map((ing) => (
                              <span key={ing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                                <ShoppingCart className="h-3 w-3" />{ing}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Instructions</p>
                          <ol className="space-y-2">
                            {recipe.instructions.map((step: string, i: number) => (
                              <li key={i} className="flex gap-2 text-sm text-card-foreground">
                                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Nutrition */}
                        <NutritionCard
                          recipeId={recipe.id}
                          recipeName={recipe.name}
                          ingredients={recipe.ingredients}
                          servings={1}
                        />

                        {/* Action bar */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            {match.missing.length > 0 && (
                              isInGrocery ? (
                                <Button variant="outline" size="sm" onClick={() => { removeFromGrocery(recipe.id); toast.success('Removed from grocery list'); }}>
                                  <Check className="h-4 w-4 mr-1" /> In Grocery
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => { addToGrocery(recipe.id); toast.success(`Added ${match.missing.length} missing items to grocery list`); }}>
                                  <ShoppingCart className="h-4 w-4 mr-1" /> Add {match.missing.length} to Grocery
                                </Button>
                              )
                            )}
                          </div>
                          <Button size="sm" onClick={() => navigate(`/cook/${recipe.id}`)}>
                            <Play className="h-4 w-4 mr-1" /> Cook
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
