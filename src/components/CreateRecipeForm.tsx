import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Loader2, Camera, ClipboardPaste, Globe, Upload, Sparkles, Clock3, ChefHat, Tags, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/lib/store';
import { getGeneratedRecipeCoverDataUri } from '@/lib/recipeCover';
import { composeIngredientLine, parseIngredientLine } from '@/lib/ingredientText';
import type { Recipe } from '@/data/recipes';

interface Props {
  onClose: () => void;
  initialRecipe?: Recipe | null;
  mode?: 'create' | 'edit-local';
}

function RecipeFormSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-500">
        {title}
      </p>
      <p className="text-base font-semibold text-stone-900">{description}</p>
    </div>
  );
}

function RecipeFormPanel({
  title,
  description,
  children,
  accent = 'orange',
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  accent?: 'orange' | 'stone';
}) {
  const accentClassName = accent === 'orange'
    ? 'border-orange-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF8F1_100%)]'
    : 'border-stone-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFCF8_100%)]';

  return (
    <section className={`rounded-[1.6rem] border p-4 shadow-[0_12px_34px_rgba(28,25,23,0.05)] sm:p-5 ${accentClassName}`}>
      <RecipeFormSectionHeader title={title} description={description} />
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

const QUANTITY_HINTS: { keywords: string[]; defaultValue: string; options: string[] }[] = [
  { keywords: ["milk", "stock", "broth", "water", "oil", "soy sauce", "vinegar", "juice"], defaultValue: "1 cup", options: ["1 tbsp", "1 tsp", "1/4 cup", "1/2 cup", "1 cup", "1 liter"] },
  { keywords: ["flour", "sugar", "salt", "rice", "pasta", "oats"], defaultValue: "100 g", options: ["1 tsp", "1 tbsp", "1/2 cup", "1 cup", "100 g", "1 kg", "1 lb"] },
  { keywords: ["tomato", "onion", "egg", "lemon", "lime", "potato", "carrot", "pepper", "avocado"], defaultValue: "1 unit", options: ["1 unit", "2 units", "3 units", "1/2 unit"] },
  { keywords: ["can", "canned", "beans", "coconut milk"], defaultValue: "1 container", options: ["1 container", "2 containers", "400 ml"] },
  { keywords: ["chicken", "beef", "pork", "fish", "salmon", "tofu"], defaultValue: "1 lb", options: ["200 g", "500 g", "1 kg", "1 lb", "2 lb"] },
];

function detectQuantityConfig(ingredientName: string) {
  const normalized = ingredientName.toLowerCase();
  const match = QUANTITY_HINTS.find((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)));
  return match || { defaultValue: "1 unit", options: ["1 unit", "2 units", "1/2 cup", "1 cup", "100 g", "1 kg", "1 lb", "1 container"] };
}

// ---- Local heuristic parser (no AI) ----
function parseRecipeText(raw: string): {
  name: string;
  ingredients: string[];
  instructions: string[];
  cookTime: string;
  difficulty: string;
  cuisine: string;
} {
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let name = '';
  const ingredients: string[] = [];
  const instructions: string[] = [];
  let cookTime = '';
  let cuisine = '';
  let difficulty = 'Intermediate';

  // Detect sections
  type Section = 'unknown' | 'ingredients' | 'instructions' | 'meta';
  let currentSection: Section = 'unknown';

  const ingredientHeaders = /^(ingredients|what you.?ll need|you.?ll need|shopping list)/i;
  const instructionHeaders = /^(instructions|directions|steps|method|preparation|how to make|how to cook)/i;
  const metaHeaders = /^(notes|nutrition|tips|info|cook time|prep time|servings)/i;
  const timePattern = /(\d+\s*(min|minute|minutes|hr|hrs|hour|hours))/i;
  const servingsPattern = /serv(es|ings?)?\s*:?\s*\d+/i;

  // Heuristic: first non-trivial line that isn't a section header = recipe name
  for (const line of lines) {
    const stripped = line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim();
    if (
      stripped.length > 2 &&
      !ingredientHeaders.test(stripped) &&
      !instructionHeaders.test(stripped) &&
      !metaHeaders.test(stripped) &&
      !servingsPattern.test(stripped) &&
      !timePattern.test(stripped)
    ) {
      name = stripped;
      break;
    }
  }

  for (const line of lines) {
    const stripped = line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim();

    // Check for section headers
    if (ingredientHeaders.test(stripped)) {
      currentSection = 'ingredients';
      continue;
    }
    if (instructionHeaders.test(stripped)) {
      currentSection = 'instructions';
      continue;
    }
    if (metaHeaders.test(stripped)) {
      currentSection = 'meta';
      continue;
    }

    // Skip the name line
    if (stripped === name) continue;

    // Extract cook time from anywhere
    if (!cookTime) {
      const timeMatch = stripped.match(/(?:cook|prep|total|time)[:\s]*(\d+\s*(?:min|minute|minutes|hr|hrs|hour|hours)[\s\d]*(?:min|minute|minutes)?)/i);
      if (timeMatch) {
        cookTime = timeMatch[1].trim();
        continue;
      }
    }

    if (currentSection === 'ingredients') {
      // Clean up bullet points, numbers, dashes
      const cleaned = stripped.replace(/^[-•*·▪◦▢]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (cleaned.length > 1) {
        ingredients.push(cleaned);
      }
    } else if (currentSection === 'instructions') {
      const cleaned = stripped.replace(/^[-•*·▪◦▢]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (cleaned.length > 5) {
        instructions.push(cleaned);
      }
    } else if (currentSection === 'unknown') {
      // Try to auto-detect: short lines with common ingredient patterns
      const cleaned = stripped.replace(/^[-•*·▪◦▢]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (looksLikeIngredient(cleaned)) {
        currentSection = 'ingredients';
        ingredients.push(cleaned);
      } else if (looksLikeInstruction(cleaned)) {
        currentSection = 'instructions';
        instructions.push(cleaned);
      }
    }
  }

  // If we found nothing in sections, try splitting: short lines = ingredients, long = instructions
  if (ingredients.length === 0 && instructions.length === 0) {
    for (const line of lines) {
      const stripped = line.replace(/^[-•*·▪◦▢]\s*/, '').replace(/^\d+[.)]\s*/, '').replace(/^#+\s*/, '').trim();
      if (stripped === name || stripped.length < 2) continue;
      if (stripped.length < 50 && !stripped.includes('.')) {
        ingredients.push(stripped);
      } else if (stripped.length >= 15) {
        instructions.push(stripped);
      }
    }
  }

  return { name, ingredients, instructions, cookTime, difficulty, cuisine };
}

function looksLikeIngredient(s: string): boolean {
  if (s.length > 80 || s.length < 2) return false;
  // Contains a quantity-like start
  if (/^[\d½¼¾⅓⅔⅛\/]/.test(s)) return true;
  // Common ingredient words
  if (/\b(cup|tbsp|tsp|oz|tablespoon|teaspoon|pound|clove|pinch|dash)\b/i.test(s)) return true;
  return false;
}

function looksLikeInstruction(s: string): boolean {
  if (s.length < 15) return false;
  // Starts with a verb or numbered step
  if (/^(preheat|heat|cook|bake|mix|stir|add|combine|place|pour|whisk|fold|season|serve|let|bring|cut|chop|dice|slice|drain|rinse|set|remove|transfer|cover|simmer|boil|sauté|fry|grill|roast|broil|blend|process)/i.test(s)) return true;
  if (/^\d+[.)]\s*\w/.test(s)) return true;
  return false;
}

export default function CreateRecipeForm({ onClose, initialRecipe = null, mode = 'create' }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [fetchingPhoto, setFetchingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const isEditingLocal = mode === 'edit-local' && Boolean(initialRecipe);

  const [name, setName] = useState(initialRecipe?.name || '');
  const [image, setImage] = useState(initialRecipe?.image || '');
  const [cookTime, setCookTime] = useState(initialRecipe?.cook_time || '');
  const [difficulty, setDifficulty] = useState(initialRecipe?.difficulty || 'Beginner');
  const [cuisine, setCuisine] = useState(initialRecipe?.cuisine || '');
  const [isOriginalRecipe, setIsOriginalRecipe] = useState(Boolean(initialRecipe?.chef));
  const [servings, setServings] = useState(String(initialRecipe?.servings || 4));
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('1 unit');
  const [ingredients, setIngredients] = useState<string[]>(initialRecipe?.ingredients || []);
  const [instructionInput, setInstructionInput] = useState('');
  const [instructions, setInstructions] = useState<string[]>(initialRecipe?.instructions || []);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialRecipe?.tags || []);
  const { likeRecipe, shareCustomRecipesByDefault } = useStore();
  const [isPublic, setIsPublic] = useState(initialRecipe?.is_public ?? shareCustomRecipesByDefault);
  const [chefUsername, setChefUsername] = useState<string | null>(null);
  const [chefDisplayName, setChefDisplayName] = useState<string | null>(null);
  const generatedCover = useMemo(
    () => getGeneratedRecipeCoverDataUri({ name: name.trim() || 'Untitled Recipe', cuisine, tags }),
    [cuisine, name, tags],
  );

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active || !profile) return;

      setChefDisplayName((profile as any).display_name || null);
      setChefUsername((profile as any).username || null);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const parsed = parseRecipeText(pasteText);
    if (parsed.name) setName(parsed.name);
    if (parsed.ingredients.length > 0) setIngredients(parsed.ingredients);
    if (parsed.instructions.length > 0) setInstructions(parsed.instructions);
    if (parsed.cookTime) setCookTime(parsed.cookTime);
    if (parsed.cuisine) setCuisine(parsed.cuisine);
    if (parsed.difficulty) setDifficulty(parsed.difficulty);
    setShowPaste(false);
    setPasteText('');
    toast({ title: `Parsed ${parsed.ingredients.length} ingredients & ${parsed.instructions.length} steps` });
  };

  const generateCover = async () => {
    setFetchingPhoto(true);
    try {
      setImage(generatedCover);
      toast({ title: 'Generated a recipe cover' });
    } finally {
      setFetchingPhoto(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large (max 5MB)', variant: 'destructive' });
      return;
    }

    setUploadingPhoto(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const userId = session?.user?.id || 'anonymous';
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('recipe-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-photos')
        .getPublicUrl(filePath);

      setImage(publicUrl);
      toast({ title: 'Photo uploaded!' });
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addIngredient = () => {
    const name = ingredientInput.trim();
    const quantity = ingredientQuantity.trim();
    if (!name) return;
    const formatted = composeIngredientLine({ name, quantity });
    if (!ingredients.includes(formatted)) {
      setIngredients(prev => [...prev, formatted]);
      setIngredientInput('');
      setIngredientQuantity('1 unit');
    }
  };

  const addInstruction = () => {
    const val = instructionInput.trim();
    if (val) {
      setInstructions((prev) => [...prev, val]);
      setInstructionInput('');
    }
  };

  const removeInstruction = (index: number) => {
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, value: string) => {
    setIngredients((prev) => prev.map((ingredient, i) => (i === index ? value : ingredient)));
  };

  const updateIngredientPart = (index: number, field: 'name' | 'quantity', value: string) => {
    setIngredients((prev) =>
      prev.map((ingredient, i) => {
        if (i !== index) return ingredient;
        const parsed = parseIngredientLine(ingredient);
        return composeIngredientLine({
          ...parsed,
          [field]: value,
        });
      }),
    );
  };

  const updateInstruction = (index: number, value: string) => {
    setInstructions((prev) => prev.map((step, i) => (i === index ? value : step)));
  };

  const addTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (val && !tags.includes(val)) {
      setTags(prev => [...prev, val]);
      setTagInput('');
    }
  };

  const quantityConfig = detectQuantityConfig(ingredientInput);
  const basicsReady = Boolean(name.trim());
  const ingredientCount = ingredients.length;
  const instructionCount = instructions.length;
  const metadataCount = tags.length + (isOriginalRecipe ? 1 : 0) + (isPublic ? 1 : 0);
  const fieldClassName =
    'mt-1 h-11 rounded-2xl border-stone-200 bg-white/96 text-stone-800 placeholder:text-stone-400 shadow-sm focus-visible:ring-orange-300 focus-visible:ring-offset-0';
  const sectionFieldClassName =
    'rounded-2xl border-stone-200 bg-white/96 text-stone-800 placeholder:text-stone-400 shadow-sm focus-visible:ring-orange-300 focus-visible:ring-offset-0';
  const recipeTitle = isEditingLocal ? 'Edit recipe' : 'Add recipe';
  const recipeSubtitle = isEditingLocal
    ? 'Refine the details, tighten the steps, and keep this recipe ready for your cookbook.'
    : 'Capture a recipe once, give it a polished home, and keep it ready for planning and cooking.';
  const completionCount = [
    Boolean(name.trim()),
    ingredients.length > 0,
    instructions.length > 0,
    Boolean(cookTime.trim()),
    Boolean(cuisine.trim()),
  ].filter(Boolean).length;

  const handleSubmit = async () => {
    if (!name.trim() || ingredients.length === 0) {
      toast({ title: 'Name and at least 1 ingredient required', variant: 'destructive' });
      return;
    }

    const stepList = instructions.map((s) => s.trim()).filter(Boolean);
    const finalImage = image || generatedCover;

    if (isEditingLocal && initialRecipe) {
      likeRecipe(initialRecipe.id, {
        ...initialRecipe,
        name: name.trim(),
        image: finalImage,
        cook_time: cookTime.trim() || '30 min',
        difficulty,
        cuisine: cuisine.trim() || null,
        chef: isOriginalRecipe ? (chefUsername ? `@${chefUsername}` : chefDisplayName || initialRecipe?.chef || null) : null,
        ingredients,
        tags,
        instructions: stepList,
        servings: parseInt(servings) || 4,
        is_public: initialRecipe.is_public,
      });

      toast({ title: 'Local recipe updated' });
      onClose();
      return;
    }

    let userId = (await supabase.auth.getSession()).data.session?.user?.id;

    // If local session isn't ready, attempt a single refresh
    if (!userId) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      userId = refreshed.session?.user?.id;
    }

    if (!userId) {
      await supabase.auth.signOut();
      toast({
        title: 'Session expired',
        description: 'Please sign in again to create recipes.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', userId)
        .maybeSingle();

      const resolvedChefName = chefUsername
        ? `@${chefUsername}`
        : profile?.username
          ? `@${String(profile.username).trim()}`
          : profile?.display_name?.trim()
            || chefDisplayName?.trim()
            || initialRecipe?.chef?.trim()
            || null;

      const displayChefName = isOriginalRecipe ? resolvedChefName : null;

      const recipeId = crypto.randomUUID();
      const { error } = await supabase.from('recipes').insert({
        id: recipeId,
        name: name.trim(),
        image: finalImage,
        cook_time: cookTime.trim() || '30 min',
        difficulty,
        cuisine: cuisine.trim() || null,
        ingredients,
        tags,
        instructions: stepList,
        source: 'community',
        chef: displayChefName,
        created_by: userId,
        is_public: isPublic,
        servings: parseInt(servings) || 4,
      } as any);

      if (error) throw error;

      // Also save to local liked recipes so it appears in All Recipes
      likeRecipe(recipeId, {
        id: recipeId,
        name: name.trim(),
        image: finalImage,
        cook_time: cookTime.trim() || '30 min',
        difficulty,
        cuisine: cuisine.trim() || null,
        chef: displayChefName,
        created_by: userId,
        ingredients,
        tags,
        instructions: stepList,
        source: 'community',
        servings: parseInt(servings) || 4,
      });

      toast({ title: 'Recipe created! 🎉' });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to create recipe', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="space-y-5 pb-1 text-stone-800"
      style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="border-b border-orange-100/80 px-1 pb-5 pt-1 sm:px-2 sm:pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-500">{recipeTitle}</p>
              <h2 className="mt-2 text-[1.9rem] font-bold leading-none text-stone-900 sm:text-[2.2rem]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {name.trim() || (isEditingLocal ? 'Refine your recipe' : 'Build a new recipe')}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-stone-600">
                {recipeSubtitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 self-start sm:flex sm:flex-wrap">
              <div className="rounded-2xl border border-orange-100 bg-white/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Ready</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{completionCount}/5</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Ingredients</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{ingredientCount}</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Steps</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{instructionCount}</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Tags</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{tags.length}</p>
              </div>
            </div>
          </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_300px]">
          <div className="space-y-5">
            <RecipeFormPanel
              title="Quick Start"
              description="Drop in recipe text and let munch shape the first draft"
            >
              {showPaste ? (
                <div className="space-y-3 rounded-[1.35rem] border border-orange-100 bg-orange-50/60 p-4">
                  <label className="text-sm font-semibold text-stone-800">Paste recipe text</label>
                  <p className="text-xs text-stone-500">
                    Paste a full recipe and we&apos;ll pull out the name, ingredients, and instructions for you.
                  </p>
                  <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={"Grandma's Famous Pasta\n\nIngredients:\n2 cups flour\n3 eggs\n...\n\nInstructions:\n1. Mix flour and eggs...\n2. Knead the dough..."}
                    rows={8}
                    autoFocus
                    className="rounded-2xl border-stone-200 bg-white/96 text-stone-800 placeholder:text-stone-400 shadow-sm focus-visible:ring-orange-300 focus-visible:ring-offset-0"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={handleParsePaste} disabled={!pasteText.trim()} className="h-11 flex-1 rounded-2xl bg-orange-500 text-white hover:bg-orange-600">
                      <ClipboardPaste className="mr-2 h-4 w-4" /> Auto-Fill Fields
                    </Button>
                    <Button variant="outline" onClick={() => { setShowPaste(false); setPasteText(''); }} className="h-11 rounded-2xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-[1.35rem] border border-dashed border-orange-200 bg-orange-50/45 px-4 py-4 text-left transition-colors hover:border-orange-300 hover:bg-orange-50"
                  onClick={() => setShowPaste(true)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900">Paste and auto-parse</p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">Great for recipes copied from notes, docs, or websites.</p>
                  </div>
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                    <ClipboardPaste className="h-4 w-4" />
                  </span>
                </button>
              )}
            </RecipeFormPanel>

            <RecipeFormPanel
              title="Recipe Details"
              description={basicsReady ? 'Core details are in place' : 'Start with the name, image, and kitchen basics'}
            >
              <div>
                <label className="text-sm font-semibold text-stone-800">Recipe Name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grandma's Pasta" className={fieldClassName} />
              </div>

              <div>
                <label className="text-sm font-semibold text-stone-800">Recipe Image</label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="h-11 rounded-2xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50"
                  >
                    {uploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCover}
                    disabled={fetchingPhoto}
                    className="h-11 rounded-2xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50"
                  >
                    {fetchingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    Generate Cover
                  </Button>
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  Auto-generated covers pull from the recipe name, cuisine, and tags so the card feels more intentional.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-stone-800">Cook Time</label>
                  <Input value={cookTime} onChange={e => setCookTime(e.target.value)} placeholder="25 min" className={fieldClassName} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-800">Servings</label>
                  <Select value={servings} onValueChange={setServings}>
                    <SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'serving' : 'servings'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-800">Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-800">Cuisine</label>
                  <Input value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="Italian" className={fieldClassName} />
                </div>
              </div>
            </RecipeFormPanel>

            <RecipeFormPanel
              title="Ingredients"
              description={`${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'} in the recipe`}
            >
              <div className="space-y-3 rounded-[1.35rem] border border-orange-100 bg-orange-50/55 p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-stone-800">Ingredients *</label>
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-500"><Sparkles className="h-3 w-3" /> smart quantities</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.9fr)_126px_auto]">
                  <Input
                    value={ingredientInput}
                    onChange={e => {
                      const next = e.target.value;
                      setIngredientInput(next);
                      if (next.trim().length > 2) {
                        setIngredientQuantity(detectQuantityConfig(next).defaultValue);
                      }
                    }}
                    placeholder="Ingredient name"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                    className={fieldClassName}
                  />
                  <Select value={ingredientQuantity} onValueChange={setIngredientQuantity}>
                    <SelectTrigger className={fieldClassName}><SelectValue placeholder="Quantity" /></SelectTrigger>
                    <SelectContent>
                      {quantityConfig.options.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={addIngredient} className="h-11 rounded-2xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50">
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {ingredients.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-dashed border-stone-200 bg-white/80 px-4 py-5 text-sm text-stone-500">
                    Add the ingredients one line at a time so the recipe scales cleanly later.
                  </div>
                ) : ingredients.map((ingredient, index) => (
                  <div key={`${ingredient}-${index}`} className="grid grid-cols-[74px_minmax(0,1fr)_40px] gap-2 rounded-[1.25rem] border border-stone-200 bg-white/92 p-2.5">
                    <Input
                      value={parseIngredientLine(ingredient).quantity}
                      onChange={(e) => updateIngredientPart(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className={sectionFieldClassName + " h-10 px-3 py-1 text-sm"}
                    />
                    <Input
                      value={parseIngredientLine(ingredient).name}
                      onChange={(e) => updateIngredientPart(index, 'name', e.target.value)}
                      className={sectionFieldClassName + " h-10 px-3 py-1 text-sm"}
                    />
                    <button
                      type="button"
                      onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== index))}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </RecipeFormPanel>

            <RecipeFormPanel
              title="Steps & Tags"
              description={`${instructionCount} step${instructionCount === 1 ? '' : 's'} and ${tags.length} tag${tags.length === 1 ? '' : 's'}`}
              accent="stone"
            >
              <div>
                <label className="text-sm font-semibold text-stone-800">Tags</label>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder="e.g. spicy, vegan"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className={fieldClassName}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTag} className="h-11 w-11 shrink-0 rounded-2xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="outline" className="gap-1 rounded-full border-orange-200 bg-orange-50/70 px-3 py-1 text-orange-700">
                      {tag}
                      <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-stone-800">Instructions</label>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    placeholder="Add a cooking step"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInstruction())}
                    className={fieldClassName}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addInstruction} className="h-11 w-11 shrink-0 rounded-2xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 space-y-2.5">
                  {instructions.length === 0 ? (
                    <div className="rounded-[1.3rem] border border-dashed border-stone-200 bg-white/80 px-4 py-5 text-sm text-stone-500">
                      Add one step at a time to keep the cooking flow easy to scan.
                    </div>
                  ) : instructions.map((step, index) => (
                    <div key={`${step}-${index}`} className="flex items-center gap-2 rounded-[1.25rem] border border-stone-200 bg-white/92 p-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-sm font-semibold text-orange-600">
                        {index + 1}
                      </span>
                      <Input
                        value={step}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        className={sectionFieldClassName + " h-10 flex-1"}
                      />
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </RecipeFormPanel>

            <RecipeFormPanel
              title="Author & Sharing"
              description={`${metadataCount} setting${metadataCount === 1 ? '' : 's'} active`}
            >
              <div className="space-y-3 rounded-[1.35rem] border border-orange-100 bg-orange-50/50 p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="is-original-recipe"
                    checked={isOriginalRecipe}
                    onCheckedChange={(checked) => setIsOriginalRecipe(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="is-original-recipe" className="cursor-pointer text-sm font-semibold text-stone-800">
                      This is my original recipe
                    </label>
                    <p className="text-xs text-stone-500">
                      Show your creator identity so people can discover more of your dishes.
                    </p>
                  </div>
                </div>

                {isOriginalRecipe && (
                  <div className="rounded-[1.2rem] border border-orange-100 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-stone-800">Recipe attribution</p>
                    <p className="mt-1 text-sm font-semibold text-orange-600">
                      {chefUsername ? `@${chefUsername}` : (chefDisplayName || initialRecipe?.chef || 'Your profile')}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      We default to your username when it&apos;s available so attribution stays unique.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-start space-x-3 rounded-[1.35rem] border border-orange-100 bg-orange-50/40 p-4">
                <Checkbox
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <label htmlFor="is-public" className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-stone-800">
                    <Globe className="h-3.5 w-3.5 text-stone-500" />
                    Make discoverable by other users
                  </label>
                  <p className="text-xs text-stone-500">
                    When enabled, this recipe can appear in Browse for the rest of the munch community.
                  </p>
                </div>
              </div>
            </RecipeFormPanel>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-0">
            <div className="overflow-hidden rounded-[1.7rem] border border-orange-100 bg-white shadow-[0_16px_38px_rgba(28,25,23,0.06)]">
              <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                <img
                  src={image || generatedCover}
                  alt={name.trim() || 'Recipe preview'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-3 px-4 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-500">Live Preview</p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                    {name.trim() || 'Untitled recipe'}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-stone-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1"><Clock3 className="h-3.5 w-3.5 text-orange-500" /> {cookTime.trim() || '30 min'}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1"><ChefHat className="h-3.5 w-3.5 text-stone-500" /> {difficulty}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1">{servings} servings</span>
                </div>
                {cuisine.trim() && (
                  <p className="text-sm text-stone-500">{cuisine.trim()}</p>
                )}
                <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-3">
                  <div className="rounded-2xl bg-orange-50/70 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Ingredients</p>
                    <p className="mt-1 text-lg font-bold text-stone-900">{ingredientCount}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Steps</p>
                    <p className="mt-1 text-lg font-bold text-stone-900">{instructionCount}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Tags</p>
                    <p className="mt-1 text-lg font-bold text-stone-900">{tags.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-stone-200 bg-white/92 p-4 shadow-[0_12px_32px_rgba(28,25,23,0.05)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Recipe Snapshot</p>
              <div className="mt-3 space-y-2.5 text-sm text-stone-600">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-orange-500" />
                  <span>{isOriginalRecipe ? 'Original recipe attribution on' : 'Creator attribution off'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tags className="h-4 w-4 text-orange-500" />
                  <span>{tags.length > 0 ? tags.slice(0, 3).join(', ') : 'No tags yet'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-orange-500" />
                  <span>{instructionCount > 0 ? `${instructionCount} cooking step${instructionCount === 1 ? '' : 's'}` : 'Instructions still needed'}</span>
                </div>
                <div className="rounded-[1.2rem] bg-orange-50/70 px-3 py-3 text-xs leading-5 text-stone-600">
                  {isPublic
                    ? 'This recipe is set to be discoverable by other munch users.'
                    : 'This recipe stays private to your kitchen unless you choose to share it.'}
                </div>
              </div>
            </div>
          </aside>
        </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
        <Button onClick={handleSubmit} disabled={loading} className="h-12 flex-1 rounded-2xl bg-orange-500 text-white hover:bg-orange-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          {isEditingLocal ? 'Save Changes' : 'Create Recipe'}
        </Button>
        <Button variant="outline" onClick={onClose} className="h-12 rounded-2xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50 sm:w-auto">Cancel</Button>
      </div>
    </div>
  );
}
