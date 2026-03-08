import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const FOODISH_API = 'https://foodish-api.com/api/';

interface Props {
  onClose: () => void;
}

export default function CreateRecipeForm({ onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [fetchingPhoto, setFetchingPhoto] = useState(false);

  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [cuisine, setCuisine] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Please sign in to create recipes', variant: 'destructive' });
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
        ingredients,
        tags,
        instructions: stepList,
        source: 'community',
        created_by: user.id,
        is_public: true,
      });

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
      <div>
        <label className="text-sm font-medium text-foreground">Recipe Name *</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grandma's Pasta" />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Photo</label>
        <div className="flex gap-2 mt-1">
          <Input value={image} onChange={e => setImage(e.target.value)} placeholder="Image URL (optional)" className="flex-1" />
          <Button type="button" variant="outline" size="sm" onClick={fetchRandomPhoto} disabled={fetchingPhoto}>
            {fetchingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Random
          </Button>
        </div>
        {image && (
          <img src={image} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground">Cook Time</label>
          <Input value={cookTime} onChange={e => setCookTime(e.target.value)} placeholder="e.g. 25 min" />
        </div>
        <div className="flex-1">
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
