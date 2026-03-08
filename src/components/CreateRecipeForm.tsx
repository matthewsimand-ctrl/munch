import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Loader2, Camera, ClipboardPaste, Globe, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const FOODISH_API = 'https://foodish-api.com/api/';

interface Props {
  onClose: () => void;
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
      const cleaned = stripped.replace(/^[-•*·▪◦]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (cleaned.length > 1) {
        // Extract just the ingredient name (strip quantities)
        const ingName = stripQuantity(cleaned);
        if (ingName) ingredients.push(ingName);
      }
    } else if (currentSection === 'instructions') {
      const cleaned = stripped.replace(/^[-•*·▪◦]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (cleaned.length > 5) {
        instructions.push(cleaned);
      }
    } else if (currentSection === 'unknown') {
      // Try to auto-detect: short lines with common ingredient patterns
      const cleaned = stripped.replace(/^[-•*·▪◦]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (looksLikeIngredient(cleaned)) {
        currentSection = 'ingredients';
        const ingName = stripQuantity(cleaned);
        if (ingName) ingredients.push(ingName);
      } else if (looksLikeInstruction(cleaned)) {
        currentSection = 'instructions';
        instructions.push(cleaned);
      }
    }
  }

  // If we found nothing in sections, try splitting: short lines = ingredients, long = instructions
  if (ingredients.length === 0 && instructions.length === 0) {
    for (const line of lines) {
      const stripped = line.replace(/^[-•*·▪◦]\s*/, '').replace(/^\d+[.)]\s*/, '').replace(/^#+\s*/, '').trim();
      if (stripped === name || stripped.length < 2) continue;
      if (stripped.length < 50 && !stripped.includes('.')) {
        const ingName = stripQuantity(stripped);
        if (ingName) ingredients.push(ingName);
      } else if (stripped.length >= 15) {
        instructions.push(stripped);
      }
    }
  }

  return { name, ingredients, instructions, cookTime, difficulty, cuisine };
}

function stripQuantity(s: string): string {
  // Remove leading quantities like "2 cups", "1/2 tsp", "100g", etc.
  return s
    .replace(/^[\d½¼¾⅓⅔⅛\/\s.,-]+\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|litres?|cloves?|cans?|bunch(es)?|pieces?|slices?|pinch(es)?|dash(es)?|handfuls?|sprigs?|stalks?|heads?|sticks?|packages?|packets?|bottles?|jars?|bags?|boxes?|containers?|large|medium|small|whole|half)\s*/i, '')
    .replace(/^of\s+/i, '')
    .replace(/,\s*(divided|chopped|minced|diced|sliced|grated|melted|softened|room temperature|to taste|optional|fresh|dried|frozen|canned|packed|loosely packed|firmly packed).*$/i, '')
    .trim()
    .toLowerCase();
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
  const [servings, setServings] = useState('4');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const parsed = parseRecipeText(pasteText);
    if (parsed.name) setName(parsed.name);
    if (parsed.ingredients.length > 0) setIngredients(parsed.ingredients);
    if (parsed.instructions.length > 0) setInstructions(parsed.instructions.join('\n'));
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
      const res = await fetch(FOODISH_API);
      const data = await res.json();
      if (data.image) setImage(data.image);
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
    const val = ingredientInput.trim().toLowerCase();
    if (val && !ingredients.includes(val)) {
      setIngredients(prev => [...prev, val]);
      setIngredientInput('');
    }
  };

  const addTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (val && !tags.includes(val)) {
      setTags(prev => [...prev, val]);
      setTagInput('');
    }
  };

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
      const stepList = instructions.split('\n').map(s => s.trim()).filter(Boolean);
      const finalImage = image || `https://foodish-api.com/images/burger/burger${Math.floor(Math.random() * 50) + 1}.jpg`;

      const { error } = await supabase.from('recipes').insert({
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
      } as any);

      if (error) throw error;

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
    <div className="space-y-4">
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
          >
            {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={fetchRandomPhoto} disabled={fetchingPhoto}>
            {fetchingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
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
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Ingredients *</label>
        <div className="flex gap-2 mt-1">
          <Input
            value={ingredientInput}
            onChange={e => setIngredientInput(e.target.value)}
            placeholder="Add ingredient"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addIngredient}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ingredients.map(ing => (
            <Badge key={ing} variant="secondary" className="gap-1">
              {ing}
              <button onClick={() => setIngredients(prev => prev.filter(i => i !== ing))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
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
        <label className="text-sm font-medium text-foreground">Instructions</label>
        <Textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="One step per line..."
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-1">Put each step on a new line.</p>
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
