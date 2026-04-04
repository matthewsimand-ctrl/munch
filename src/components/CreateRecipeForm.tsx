import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, X, Loader2, Camera, ClipboardPaste, Globe, Upload, Sparkles } from 'lucide-react';
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
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold text-stone-900">{description}</p>
    </div>
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
    'mt-1 rounded-xl border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus-visible:ring-orange-300 focus-visible:ring-offset-0';
  const sectionFieldClassName =
    'rounded-xl border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 shadow-sm focus-visible:ring-orange-300 focus-visible:ring-offset-0';

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
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Accordion
        type="multiple"
        defaultValue={["quick-start", "basics", "ingredients", "instructions"]}
        className="overflow-visible rounded-[1.5rem] border border-orange-100 bg-white/95 shadow-[0_18px_40px_rgba(249,115,22,0.06)]"
      >
        <AccordionItem value="quick-start" className="border-b border-border/70">
          <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
            <RecipeFormSectionHeader
              title="Quick Start"
              description="Paste recipe text to auto-fill the form"
            />
          </AccordionTrigger>
          <AccordionContent className="space-y-3 px-5 pb-5 sm:px-6">
            {showPaste ? (
              <div className="space-y-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                <label className="text-sm font-medium text-stone-800">Paste recipe text</label>
                <p className="text-xs text-stone-500">
                  Paste the full recipe text and we'll auto-detect the name, ingredients, and steps.
                </p>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"Grandma's Famous Pasta\n\nIngredients:\n2 cups flour\n3 eggs\n...\n\nInstructions:\n1. Mix flour and eggs...\n2. Knead the dough..."}
                  rows={8}
                  autoFocus
                  className={fieldClassName}
                />
                <div className="flex gap-2">
                  <Button onClick={handleParsePaste} disabled={!pasteText.trim()} className="flex-1">
                    <ClipboardPaste className="h-4 w-4 mr-1" /> Auto-Fill Fields
                  </Button>
                  <Button variant="outline" onClick={() => { setShowPaste(false); setPasteText(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full rounded-xl border-dashed border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50"
                onClick={() => setShowPaste(true)}
              >
                <ClipboardPaste className="h-4 w-4 mr-2" /> Paste & Auto-Parse Recipe Text
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="basics" className="border-b border-border/70">
          <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
            <RecipeFormSectionHeader
              title="Basics"
              description={basicsReady ? "Name and recipe details are filled in" : "Start with the recipe name, image, and timing"}
            />
          </AccordionTrigger>
          <AccordionContent className="space-y-4 px-5 pb-5 sm:px-6">
            <div>
              <label className="text-sm font-medium text-stone-800">Recipe Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grandma's Pasta" className={fieldClassName} />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-800">Photo</label>
              <div className="mt-1 flex gap-2">
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
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  title="Upload file"
                  className="gap-1.5 rounded-xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50"
                >
                  {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span className="hidden sm:inline">Upload File</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateCover}
                  disabled={fetchingPhoto}
                  title="Generate random cover"
                  className="gap-1.5 rounded-xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50"
                >
                  {fetchingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <span className="hidden sm:inline">Generate Random Cover</span>
                </Button>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                Generated covers already use keywords from the recipe name, cuisine, and tags to choose a matching visual style.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-stone-800">Cook Time</label>
                <Input value={cookTime} onChange={e => setCookTime(e.target.value)} placeholder="25 min" className={fieldClassName} />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-800">Servings</label>
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
                <label className="text-sm font-medium text-stone-800">Difficulty</label>
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
                <label className="text-sm font-medium text-stone-800">Cuisine</label>
                <Input value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="Italian" className={fieldClassName} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ingredients" className="border-b border-border/70">
          <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
            <RecipeFormSectionHeader
              title="Ingredients"
              description={`${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'} added`}
            />
          </AccordionTrigger>
          <AccordionContent className="space-y-3 px-5 pb-5 sm:px-6">
            <div className="space-y-3 rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-stone-800">Ingredients *</label>
                <span className="inline-flex items-center gap-1 text-[11px] text-stone-500"><Sparkles className="h-3 w-3" /> smart quantity suggestions</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-2">
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
                <Button type="button" variant="outline" onClick={addIngredient} className="rounded-xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-1.5 pt-2">
                {ingredients.map((ingredient, index) => (
                  <div key={`${ingredient}-${index}`} className="flex items-center gap-2 group">
                    <Input
                      value={parseIngredientLine(ingredient).quantity}
                      onChange={(e) => updateIngredientPart(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className={sectionFieldClassName + " h-9 w-28 shrink-0 px-3 py-1 text-sm"}
                    />
                    <Input
                      value={parseIngredientLine(ingredient).name}
                      onChange={(e) => updateIngredientPart(index, 'name', e.target.value)}
                      className={sectionFieldClassName + " h-9 flex-1 px-3 py-1 text-sm"}
                    />
                    <button
                      type="button"
                      onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== index))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="instructions" className="border-b border-border/70">
          <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
            <RecipeFormSectionHeader
              title="Instructions & Tags"
              description={`${instructionCount} step${instructionCount === 1 ? '' : 's'} and ${tags.length} tag${tags.length === 1 ? '' : 's'}`}
            />
          </AccordionTrigger>
          <AccordionContent className="space-y-4 px-5 pb-5 sm:px-6">
            <div>
              <label className="text-sm font-medium text-stone-800">Tags</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="e.g. spicy, vegan"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className={fieldClassName}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag} className="rounded-xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-stone-800">Steps / Instructions</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  placeholder="Add a cooking step"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInstruction())}
                  className={fieldClassName}
                />
                <Button type="button" variant="outline" size="icon" onClick={addInstruction} className="rounded-xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {instructions.map((step, index) => (
                  <div key={`${step}-${index}`} className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-semibold text-orange-600">
                      {index + 1}
                    </span>
                    <Input
                      value={step}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      className={fieldClassName + " h-10 flex-1"}
                    />
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-stone-500">Add one step at a time.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sharing">
          <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
            <RecipeFormSectionHeader
              title="Author & Sharing"
              description={`${metadataCount} sharing or author option${metadataCount === 1 ? '' : 's'} set`}
            />
          </AccordionTrigger>
          <AccordionContent className="space-y-4 px-5 pb-5 sm:px-6">
            <div className="space-y-3 rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="is-original-recipe"
                  checked={isOriginalRecipe}
                  onCheckedChange={(checked) => setIsOriginalRecipe(checked === true)}
                  className="mt-0.5"
                />
            <div className="space-y-0.5">
              <label htmlFor="is-original-recipe" className="cursor-pointer text-sm font-medium text-stone-800">
                    This is my original recipe
              </label>
                  <p className="text-xs text-stone-500">
                    Show your unique creator profile on the recipe so people can find the rest of your dishes.
                  </p>
                </div>
              </div>

              {isOriginalRecipe && (
                <div className="rounded-2xl border border-orange-100 bg-white px-4 py-3">
                  <p className="text-sm font-medium text-stone-800">Recipe attribution</p>
                  <p className="mt-1 text-sm font-semibold text-orange-600">
                    {chefUsername ? `@${chefUsername}` : (chefDisplayName || initialRecipe?.chef || 'Your profile')}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    We use your username by default so attribution stays unique and links back to your recipe profile.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start space-x-3 rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
              <Checkbox
                id="is-public"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <label htmlFor="is-public" className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-stone-800">
                  <Globe className="h-3.5 w-3.5 text-stone-500" />
                  Make discoverable by other users
                </label>
                <p className="text-xs text-stone-500">
                  Your recipe will appear in the Browse section for everyone to find.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        <Button onClick={handleSubmit} disabled={loading} className="h-11 flex-1 rounded-xl">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          {isEditingLocal ? 'Save Changes' : 'Create Recipe'}
        </Button>
        <Button variant="outline" onClick={onClose} className="h-11 rounded-xl border-orange-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50 sm:w-auto">Cancel</Button>
      </div>
    </div>
  );
}
