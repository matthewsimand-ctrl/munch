import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Loader2, Camera, ClipboardPaste, Globe, Upload, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/lib/store';

const FOODISH_API = 'https://foodish-api.com/api/';

// Keyword → Foodish category mapping (no AI)
const FOODISH_CATEGORIES = [
  'biryani', 'burger', 'butter-chicken', 'dessert', 'dosa',
  'idly', 'pasta', 'pizza', 'rice', 'samosa',
];

const KEYWORD_TO_CATEGORY: Record<string, string> = {
  // Biryani / rice dishes
  biryani: 'biryani', rice: 'biryani', pilaf: 'biryani', fried: 'biryani',
  // Burger / sandwiches
  burger: 'burger', sandwich: 'burger', wrap: 'burger', hot: 'burger',
  // Chicken / curries
  chicken: 'butter-chicken', curry: 'butter-chicken', tikka: 'butter-chicken',
  masala: 'butter-chicken', korma: 'butter-chicken', gravy: 'butter-chicken',
  // Desserts
  cake: 'dessert', cookie: 'dessert', brownie: 'dessert', dessert: 'dessert',
  sweet: 'dessert', pudding: 'dessert', pie: 'dessert', tart: 'dessert',
  chocolate: 'dessert', ice: 'dessert', muffin: 'dessert', cupcake: 'dessert',
  // Dosa
  dosa: 'dosa', crepe: 'dosa', pancake: 'dosa',
  // Idly
  idly: 'idly', idli: 'idly', steamed: 'idly',
  // Pasta
  pasta: 'pasta', spaghetti: 'pasta', noodle: 'pasta', lasagna: 'pasta',
  penne: 'pasta', fettuccine: 'pasta', mac: 'pasta', macaroni: 'pasta',
  // Pizza
  pizza: 'pizza', flatbread: 'pizza', calzone: 'pizza',
  // Samosa
  samosa: 'samosa', dumpling: 'samosa', spring: 'samosa', empanada: 'samosa',
};

function getCategoryFromName(recipeName: string): string {
  const words = recipeName.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  for (const word of words) {
    if (KEYWORD_TO_CATEGORY[word]) return KEYWORD_TO_CATEGORY[word];
    // Partial match
    for (const key of Object.keys(KEYWORD_TO_CATEGORY)) {
      if (word.includes(key) || key.includes(word)) return KEYWORD_TO_CATEGORY[key];
    }
  }
  // Random fallback
  return FOODISH_CATEGORIES[Math.floor(Math.random() * FOODISH_CATEGORIES.length)];
}

async function getRandomFoodishImage(recipeName = ''): Promise<string | null> {
  try {
    const category = getCategoryFromName(recipeName);
    const res = await fetch(`${FOODISH_API}images/${category}`);
    if (!res.ok) {
      // Fallback to generic random
      const fallback = await fetch(FOODISH_API);
      if (!fallback.ok) return null;
      const fd = await fallback.json();
      return typeof fd?.image === 'string' ? fd.image : null;
    }
    const data = await res.json();
    return typeof data?.image === 'string' ? data.image : null;
  } catch {
    return null;
  }
}

interface Props {
  onClose: () => void;
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

export default function CreateRecipeForm({ onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [fetchingPhoto, setFetchingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [cuisine, setCuisine] = useState('');
  const [chef, setChef] = useState('');
  const [servings, setServings] = useState('4');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('1 unit');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [instructionInput, setInstructionInput] = useState('');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const { likeRecipe, shareCustomRecipesByDefault } = useStore();
  const [isPublic, setIsPublic] = useState(shareCustomRecipesByDefault);

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

  const fetchRandomPhoto = async () => {
    setFetchingPhoto(true);
    try {
      const randomImage = await getRandomFoodishImage(name);
      if (randomImage) {
        setImage(randomImage);
      } else {
        toast({ title: 'Could not fetch photo', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not fetch photo', variant: 'destructive' });
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
    const val = ingredientInput.trim();
    if (!val) return;
    const formatted = `${val} (${ingredientQuantity})`;
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

  const handleSubmit = async () => {
    if (!name.trim() || ingredients.length === 0) {
      toast({ title: 'Name and at least 1 ingredient required', variant: 'destructive' });
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
      const stepList = instructions.map((s) => s.trim()).filter(Boolean);
      const finalImage = image || (await getRandomFoodishImage(name)) || '/placeholder.svg';

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();

      const typedDisplayName = chef.trim();
      const displayChefName = typedDisplayName || profile?.display_name?.trim() || null;

      if (typedDisplayName && typedDisplayName !== profile?.display_name?.trim()) {
        await supabase
          .from('profiles')
          .update({ display_name: typedDisplayName })
          .eq('user_id', userId);
      }

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
    <div className="space-y-4 px-1 pb-1">
      {/* Paste & Auto-Parse */}
      {showPaste ? (
        <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
          <label className="text-sm font-medium text-foreground">Paste recipe text</label>
          <p className="text-xs text-muted-foreground">
            Paste the full recipe text and we'll auto-detect the name, ingredients, and steps.
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Grandma's Famous Pasta\n\nIngredients:\n2 cups flour\n3 eggs\n...\n\nInstructions:\n1. Mix flour and eggs...\n2. Knead the dough..."}
            rows={8}
            autoFocus
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
          className="w-full border-dashed"
          onClick={() => setShowPaste(true)}
        >
          <ClipboardPaste className="h-4 w-4 mr-2" /> Paste & Auto-Parse Recipe Text
        </Button>
      )}

      <div>
        <label className="text-sm font-medium text-foreground">Recipe Name *</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grandma's Pasta" />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Photo</label>
        <div className="flex gap-2 mt-1">
          <Input value={image} onChange={e => setImage(e.target.value)} placeholder="Image URL (optional)" className="flex-1" />
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
            title="Upload photo"
          >
            {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchRandomPhoto}
            disabled={fetchingPhoto}
            title="Use random photo"
            className="gap-1.5"
          >
            {fetchingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span className="hidden sm:inline">Random Photo</span>
          </Button>
        </div>
        {image && (
          <img src={image} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Cook Time</label>
          <Input value={cookTime} onChange={e => setCookTime(e.target.value)} placeholder="25 min" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Servings</label>
          <Select value={servings} onValueChange={setServings}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'serving' : 'servings'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Difficulty</label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Cuisine</label>
          <Input value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="Italian" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Display name (optional)</label>
          <Input value={chef} onChange={e => setChef(e.target.value)} placeholder="Shown as recipe author name" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Ingredients *</label>
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> smart quantity suggestions</span>
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
          />
          <Select value={ingredientQuantity} onValueChange={setIngredientQuantity}>
            <SelectTrigger><SelectValue placeholder="Quantity" /></SelectTrigger>
            <SelectContent>
              {quantityConfig.options.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={addIngredient}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-1.5 pt-2">
          {ingredients.map((ingredient, index) => (
            <div key={`${ingredient}-${index}`} className="flex items-center gap-2 group">
              <Input
                value={ingredient}
                onChange={(e) => updateIngredient(index, e.target.value)}
                className="h-9 bg-white border-transparent hover:border-border focus:border-orange-300 focus:bg-white transition-all transition-colors px-3 py-1 text-sm shadow-sm"
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

      <div>
        <label className="text-sm font-medium text-foreground">Tags</label>
        <div className="flex gap-2 mt-1">
          <Input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="e.g. spicy, vegan"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addTag}>
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
        <label className="text-sm font-medium text-foreground">Steps / Instructions</label>
        <div className="flex gap-2 mt-1">
          <Input
            value={instructionInput}
            onChange={(e) => setInstructionInput(e.target.value)}
            placeholder="Add a cooking step"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInstruction())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addInstruction}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5 mt-2">
          {instructions.map((step, index) => (
            <div key={`${step}-${index}`} className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm">
              <span className="text-xs font-semibold text-muted-foreground pt-0.5">{index + 1}.</span>
              <Input
                value={step}
                onChange={(e) => updateInstruction(index, e.target.value)}
                className="h-8 flex-1"
              />
              <button type="button" onClick={() => removeInstruction(index)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Add one step at a time.</p>
      </div>

      <div className="flex items-start space-x-3 rounded-lg border border-border p-3 bg-muted/30">
        <Checkbox
          id="is-public"
          checked={isPublic}
          onCheckedChange={(checked) => setIsPublic(checked === true)}
          className="mt-0.5"
        />
        <div className="space-y-0.5">
          <label htmlFor="is-public" className="text-sm font-medium text-foreground flex items-center gap-1.5 cursor-pointer">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            Make discoverable by other users
          </label>
          <p className="text-xs text-muted-foreground">
            Your recipe will appear in the Browse section for everyone to find.
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Create Recipe
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
