import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, CalendarDays, FileText, Table2, GripVertical, User, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { normalizeRecipe } from '@/lib/normalizeRecipe';

import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = typeof MEAL_TYPES[number];

interface MealItem {
  id: string;
  recipe_id: string;
  recipe_name: string;
  recipe_image: string;
  day_of_week: number;
  meal_type: MealType;
  servings: number;
}

export default function MealPrep() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { likedRecipes, savedApiRecipes } = useStore();
  const { data: dbRecipes = [] } = useDbRecipes();

  const [user, setUser] = useState<any>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [addDialog, setAddDialog] = useState<{ day: number; meal: MealType } | null>(null);
  const [dragItem, setDragItem] = useState<MealItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6
  });
  const [recipePreview, setRecipePreview] = useState<{ name: string; sourceUrl?: string; instructions: string[] } | null>(null);

  // Get saved recipes list - check both DB recipes and locally cached API recipes
  const savedRecipes = useMemo(() => {
    return likedRecipes.map((id) => {
      const dbRecipe = dbRecipes.find((r) => r.id === id);
      if (dbRecipe) return { id, name: dbRecipe.name, image: dbRecipe.image };
      const apiRecipe = savedApiRecipes[id];
      if (apiRecipe) return { id, name: apiRecipe.name, image: apiRecipe.image || '/placeholder.svg' };
      return null;
    }).filter(Boolean) as { id: string; name: string; image: string }[];
  }, [likedRecipes, dbRecipes, savedApiRecipes]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth', { replace: true });
        return;
      }
      setUser(session.user);
    });
  }, [navigate]);

  // Load meal plan for current week
  const loadMealPlan = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const weekStr = format(weekStart, 'yyyy-MM-dd');

    let { data: plan } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start', weekStr)
      .single();

    if (!plan) {
      const { data: newPlan } = await supabase
        .from('meal_plans')
        .insert({ user_id: user.id, week_start: weekStr } as any)
        .select('id')
        .single();
      plan = newPlan;
    }

    if (plan) {
      setMealPlanId(plan.id);
      const { data: planItems } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', plan.id)
        .order('sort_order');

      setItems(
        (planItems || []).map((item: any) => ({
          id: item.id,
          recipe_id: item.recipe_id,
          recipe_name: item.recipe_data?.name || 'Unknown',
          recipe_image: item.recipe_data?.image || '',
          day_of_week: item.day_of_week,
          meal_type: item.meal_type as MealType,
          servings: item.servings,
        }))
      );
    }
    setLoading(false);
  }, [user, weekStart]);

  useEffect(() => {
    if (user) loadMealPlan();
  }, [user, weekStart, loadMealPlan]);

  const openRecipePreview = (item: MealItem) => {
    const dbRecipe = dbRecipes.find((r) => r.id === item.recipe_id);
    const apiRecipe = savedApiRecipes[item.recipe_id];
    const recipe = dbRecipe ? normalizeRecipe(dbRecipe) : apiRecipe ? normalizeRecipe(apiRecipe, item.recipe_id) : null;
    const sourceUrl = recipe?.source_url;
    const instructions = recipe?.instructions || [];

    if (!sourceUrl && instructions.length === 0) {
      toast({ title: 'No recipe details yet', description: 'This meal does not have a source link or instructions.' });
      return;
    }

    setRecipePreview({
      name: item.recipe_name,
      sourceUrl,
      instructions,
    });
  };

  const addRecipeToSlot = async (recipeId: string, recipeName: string, recipeImage: string) => {
    if (!mealPlanId || !addDialog) return;

    const { data, error } = await supabase
      .from('meal_plan_items')
      .insert({
        meal_plan_id: mealPlanId,
        recipe_id: recipeId,
        recipe_data: { name: recipeName, image: recipeImage },
        day_of_week: addDialog.day,
        meal_type: addDialog.meal,
        servings: 2,
        sort_order: items.filter(i => i.day_of_week === addDialog.day && i.meal_type === addDialog.meal).length,
      } as any)
      .select()
      .single();

    if (data) {
      setItems(prev => [...prev, {
        id: data.id,
        recipe_id: recipeId,
        recipe_name: recipeName,
        recipe_image: recipeImage,
        day_of_week: addDialog.day,
        meal_type: addDialog.meal as MealType,
        servings: 2,
      }]);
      toast({ title: `Added ${recipeName}` });
    }
    if (error) toast({ title: 'Failed to add', variant: 'destructive' });
    setAddDialog(null);
  };

  const removeItem = async (itemId: string) => {
    await supabase.from('meal_plan_items').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateServings = async (itemId: string, servings: number) => {
    await supabase.from('meal_plan_items').update({ servings } as any).eq('id', itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, servings } : i));
  };

  // Drag and drop
  const handleDragStart = (item: MealItem) => setDragItem(item);

  const handleDrop = async (day: number, meal: MealType) => {
    if (!dragItem) return;
    await supabase.from('meal_plan_items').update({
      day_of_week: day,
      meal_type: meal,
    } as any).eq('id', dragItem.id);
    setItems(prev => prev.map(i =>
      i.id === dragItem.id ? { ...i, day_of_week: day, meal_type: meal } : i
    ));
    setDragItem(null);
  };

  // AI Generate meal plan
  const generateAiPlan = async (days: number) => {
    if (savedRecipes.length < 2) {
      toast({ title: 'Need more recipes', description: 'Save at least 2 recipes first to generate a plan.', variant: 'destructive' });
      return;
    }
    if (!mealPlanId) return;

    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: {
          savedRecipes: savedRecipes.map(r => ({ id: r.id, name: r.name })),
          days,
          mealsPerDay: ['breakfast', 'lunch', 'dinner'],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const plan = data?.plan;
      if (!Array.isArray(plan) || plan.length === 0) {
        toast({ title: 'No plan generated', description: 'Try again or add more recipes.', variant: 'destructive' });
        return;
      }

      // Clear existing items for the affected days
      const affectedDays = new Set(plan.map((p: any) => p.day));
      const toRemove = items.filter(i => affectedDays.has(i.day_of_week));
      for (const item of toRemove) {
        await supabase.from('meal_plan_items').delete().eq('id', item.id);
      }

      // Insert new items
      const newItems: MealItem[] = [];
      for (const entry of plan) {
        const recipe = savedRecipes.find(r => r.id === entry.recipe_id);
        if (!recipe) continue;

        const { data: inserted } = await supabase
          .from('meal_plan_items')
          .insert({
            meal_plan_id: mealPlanId,
            recipe_id: entry.recipe_id,
            recipe_data: { name: recipe.name, image: recipe.image },
            day_of_week: entry.day,
            meal_type: entry.meal_type,
            servings: 2,
            sort_order: 0,
          } as any)
          .select()
          .single();

        if (inserted) {
          newItems.push({
            id: inserted.id,
            recipe_id: entry.recipe_id,
            recipe_name: recipe.name,
            recipe_image: recipe.image,
            day_of_week: entry.day,
            meal_type: entry.meal_type as MealType,
            servings: 2,
          });
        }
      }

      setItems(prev => [
        ...prev.filter(i => !affectedDays.has(i.day_of_week)),
        ...newItems,
      ]);

      toast({ title: '✨ AI meal plan generated!', description: `${newItems.length} meals planned across ${days} days.` });
    } catch (e: any) {
      console.error('AI generation error:', e);
      toast({ title: 'Generation failed', description: e.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setAiGenerating(false);
    }
  };

  // Export functions
  const exportPDF = async (exportType: 'week' | number) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait' });
    
    // Fetch full recipe data including ingredients
    const recipeIds = [...new Set(items.map(i => i.recipe_id))];
    const { data: fullRecipes } = await supabase
      .from('recipes')
      .select('*')
      .in('id', recipeIds);
    
    const recipeMap = new Map(fullRecipes?.map(r => [r.id, r]) || []);
    
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    
    // Color palette for meal types
    const mealColors: Record<MealType, [number, number, number]> = {
      breakfast: [255, 237, 213], // amber
      lunch: [220, 252, 231],     // green
      dinner: [224, 231, 255],    // indigo
      snack: [252, 231, 243],     // pink
    };
    
    // Helper to add new page if needed
    const checkAddPage = (requiredSpace: number) => {
      if (y + requiredSpace > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };
    
    // Title
    doc.setFillColor(99, 102, 241); // Primary color
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    if (exportType === 'week') {
      doc.text(`Meal Plan — Week of ${format(weekStart, 'MMM d, yyyy')}`, margin, 22);
    } else {
      doc.text(`Meal Plan — ${DAYS[exportType]}, ${format(addDays(weekStart, exportType), 'MMM d, yyyy')}`, margin, 22);
    }
    y = 45;
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Determine days to export
    const daysToExport = exportType === 'week' ? [0, 1, 2, 3, 4, 5, 6] : [exportType];
    
    // Loop through days
    daysToExport.forEach((dayIndex) => {
      const dayDate = addDays(weekStart, dayIndex);
      
      checkAddPage(25);
      
      // Day header with background
      doc.setFillColor(243, 244, 246);
      doc.rect(margin - 2, y - 6, pageWidth - 2 * margin + 4, 12, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${DAYS[dayIndex]} — ${format(dayDate, 'MMM d')}`, margin, y);
      y += 14;
      
      // Loop through meal types
      MEAL_TYPES.forEach((mealType) => {
        const dayMeals = items.filter(i => i.day_of_week === dayIndex && i.meal_type === mealType);
        
        if (dayMeals.length > 0) {
          checkAddPage(20);
          
          // Meal type header with colored background
          const bgColor = mealColors[mealType];
          doc.setFillColor(...bgColor);
          doc.rect(margin + 3, y - 5, pageWidth - 2 * margin - 6, 8, 'F');
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(mealType.charAt(0).toUpperCase() + mealType.slice(1), margin + 5, y);
          y += 10;
          
          dayMeals.forEach((meal) => {
            const recipe = recipeMap.get(meal.recipe_id);
            const apiRecipe = savedApiRecipes[meal.recipe_id];
            const recipeData = recipe ? normalizeRecipe(recipe) : apiRecipe ? normalizeRecipe(apiRecipe, meal.recipe_id) : null;
            
            checkAddPage(15);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`• ${meal.recipe_name} (${meal.servings} servings)`, margin + 8, y);
            y += 6;
            
            if (recipeData?.ingredients && recipeData.ingredients.length > 0) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(60, 60, 60);
              doc.text('Ingredients:', margin + 12, y);
              y += 5;
              
              recipeData.ingredients.forEach((ingredient: string) => {
                checkAddPage(5);
                const lines = doc.splitTextToSize(`- ${ingredient}`, pageWidth - margin - 25);
                lines.forEach((line: string) => {
                  doc.text(line, margin + 15, y);
                  y += 4;
                });
              });
              y += 3;
            }

            // Include instructions for single-day exports
            if (exportType !== 'week' && recipeData?.instructions && recipeData.instructions.length > 0) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(60, 60, 60);
              doc.text('Instructions:', margin + 12, y);
              y += 5;
              
              recipeData.instructions.forEach((step: string, idx: number) => {
                checkAddPage(5);
                const lines = doc.splitTextToSize(`${idx + 1}. ${step}`, pageWidth - margin - 25);
                lines.forEach((line: string) => {
                  doc.text(line, margin + 15, y);
                  y += 4;
                });
              });
              y += 3;
            }
          });
          y += 4;
        }
      });
      
      y += 6;
    });
    
    doc.save(`meal-plan-${exportType === 'week' ? format(weekStart, 'yyyy-MM-dd') : format(addDays(weekStart, exportType), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'PDF exported! 📄' });
    setExportDialog(false);
  };

  const exportCSV = () => {
    let csv = 'Day,Meal,Recipe,Servings\n';
    DAYS.forEach((day, di) => {
      MEAL_TYPES.forEach((meal) => {
        const dayItems = items.filter(i => i.day_of_week === di && i.meal_type === meal);
        if (dayItems.length > 0) {
          dayItems.forEach(i => {
            csv += `${day},${meal},"${i.recipe_name}",${i.servings}\n`;
          });
        }
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal-plan-${format(weekStart, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exported! 📊' });
  };

  const exportICS = async () => {
    // Fetch full recipe data for ingredients and instructions
    const recipeIds = [...new Set(items.map(i => i.recipe_id))];
    const { data: fullRecipes } = await supabase
      .from('recipes')
      .select('*')
      .in('id', recipeIds);
    
    const recipeMap = new Map(fullRecipes?.map(r => [r.id, r]) || []);
    
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Munch//Meal Plan//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n';
    
    DAYS.forEach((_, di) => {
      const date = addDays(weekStart, di);
      const dateStr = format(date, 'yyyyMMdd');
      
      MEAL_TYPES.forEach((meal) => {
        const dayItems = items.filter(i => i.day_of_week === di && i.meal_type === meal);
        
        dayItems.forEach((item) => {
          const recipe = recipeMap.get(item.recipe_id);
          const hour = meal === 'breakfast' ? '08' : meal === 'lunch' ? '12' : meal === 'dinner' ? '18' : '15';
          
          // Build description with ingredients and instructions
          let description = `Servings: ${item.servings}\\n\\n`;
          
          if (recipe?.ingredients && recipe.ingredients.length > 0) {
            description += 'INGREDIENTS:\\n';
            recipe.ingredients.forEach((ing: string) => {
              description += `- ${ing}\\n`;
            });
            description += '\\n';
          }
          
          if (recipe?.instructions && recipe.instructions.length > 0) {
            description += 'INSTRUCTIONS:\\n';
            recipe.instructions.forEach((step: string, idx: number) => {
              description += `${idx + 1}. ${step}\\n`;
            });
          }
          
          ics += `BEGIN:VEVENT\n`;
          ics += `DTSTART:${dateStr}T${hour}0000\n`;
          ics += `DTEND:${dateStr}T${String(Number(hour) + 1).padStart(2, '0')}0000\n`;
          ics += `SUMMARY:${meal.charAt(0).toUpperCase() + meal.slice(1)}: ${item.recipe_name}\n`;
          ics += `DESCRIPTION:${description}\n`;
          ics += `END:VEVENT\n`;
        });
      });
    });
    
    ics += 'END:VCALENDAR';
    
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal-plan-${format(weekStart, 'yyyy-MM-dd')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Calendar exported! 📅' });
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-orange-500">Meal Prep</span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5"
                  disabled={aiGenerating || savedRecipes.length < 2}
                  onClick={() => generateAiPlan(7)}
                >
                  {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="hidden sm:inline">{aiGenerating ? 'Generating...' : '🧠 AI Plan'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate a full week meal plan with AI based on your saved recipes</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setExportDialog(true)}>
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as PDF</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={exportCSV}>
                  <Table2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as CSV spreadsheet</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={exportICS}>
                  <Calendar className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export to calendar app</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                  <User className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Account settings</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Week Navigation + View Toggle */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setWeekStart(prev => subWeeks(prev, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous week</TooltipContent>
          </Tooltip>
          <span className="font-medium text-foreground">
            {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setWeekStart(prev => addWeeks(prev, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next week</TooltipContent>
          </Tooltip>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <Button
            variant={viewMode === 'daily' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setViewMode('daily')}
          >
            <Calendar className="h-3.5 w-3.5" /> Daily
          </Button>
          <Button
            variant={viewMode === 'weekly' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setViewMode('weekly')}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Weekly
          </Button>
        </div>
      </div>

      {/* Daily View */}
      {viewMode === 'daily' && (
        <div className="px-4 max-w-2xl mx-auto w-full">
          {/* Day selector */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDay(d => d === 0 ? 6 : d - 1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex gap-1">
              {DAYS.map((day, i) => (
                <Button
                  key={day}
                  variant={selectedDay === i ? 'default' : 'ghost'}
                  size="sm"
                  className="text-xs px-2.5"
                  onClick={() => setSelectedDay(i)}
                >
                  {day}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDay(d => d === 6 ? 0 : d + 1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <h2 className="text-lg font-bold text-foreground mb-4 text-center">
            {DAYS[selectedDay]} — {format(addDays(weekStart, selectedDay), 'MMM d, yyyy')}
          </h2>

          <div className="space-y-4">
            {MEAL_TYPES.map((meal) => {
              const slotItems = items.filter(i => i.day_of_week === selectedDay && i.meal_type === meal);
              return (
                <div key={meal} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground capitalize">{meal}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => setAddDialog({ day: selectedDay, meal })}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                  {slotItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No meals planned</p>
                  ) : (
                    <div className="space-y-2">
                      {slotItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                          onClick={() => openRecipePreview(item)}
                        >
                          {item.recipe_image && (
                            <img src={item.recipe_image} alt={item.recipe_name} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.recipe_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Select
                                value={String(item.servings)}
                                onValueChange={(v) => updateServings(item.id, parseInt(v))}
                              >
                                <SelectTrigger className="h-6 w-16 text-[10px] border-0 p-0 px-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1,2,3,4,5,6,8].map(n => (
                                    <SelectItem key={n} value={String(n)} className="text-xs">{n} servings</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Kanban Board */}
      {viewMode === 'weekly' && (
      <div className="px-4 max-w-6xl mx-auto w-full overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {/* Day headers */}
          {DAYS.map((day, i) => (
            <div key={day} className="text-center">
              <p className="font-bold text-sm text-foreground">{day}</p>
              <p className="text-[10px] text-muted-foreground">{format(addDays(weekStart, i), 'MMM d')}</p>
            </div>
          ))}

          {/* Meal slots */}
          {MEAL_TYPES.map((meal) => {
            const mealBg = meal === 'breakfast' ? 'bg-amber-50/40' : meal === 'lunch' ? 'bg-emerald-50/40' : meal === 'dinner' ? 'bg-indigo-50/40' : 'bg-pink-50/40';
            return DAYS.map((_, di) => {
              const slotItems = items.filter(i => i.day_of_week === di && i.meal_type === meal);
              return (
                <div
                  key={`${meal}-${di}`}
                  className={`min-h-[88px] ${mealBg} border border-border rounded-lg p-2 transition-colors`}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-primary'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('ring-2', 'ring-primary')}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-primary'); handleDrop(di, meal); }}
                >
                  {di === 0 && (
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">{meal}</p>
                  )}
                  {slotItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item)}
                      className="bg-background rounded-md p-2 mb-1.5 border border-border cursor-grab active:cursor-grabbing shadow-sm group text-[11px] hover:border-primary/40 transition-all"
                      onClick={() => openRecipePreview(item)}
                    >
                      <div className="flex items-start gap-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate leading-tight">{item.recipe_name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Select
                              value={String(item.servings)}
                              onValueChange={(v) => updateServings(item.id, parseInt(v))}
                            >
                              <SelectTrigger className="h-5 w-14 text-[10px] border-0 p-0 px-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1,2,3,4,5,6,8].map(n => (
                                  <SelectItem key={n} value={String(n)} className="text-xs">{n}p</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Remove from plan</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setAddDialog({ day: di, meal })}
                        className="w-full text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-0.5 py-1 rounded hover:bg-muted/50 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Add a recipe to {DAYS[di]} {meal}</TooltipContent>
                  </Tooltip>
                </div>
              );
            });
          })}
        </div>
      </div>
      )}

      {/* Add Recipe Dialog */}
      <Dialog open={!!addDialog} onOpenChange={(open) => !open && setAddDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Add Recipe — {addDialog ? `${DAYS[addDialog.day]} ${addDialog.meal}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
            {savedRecipes.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  No saved recipes yet. Browse and save some first!
                </p>
                <Button size="sm" onClick={() => { setAddDialog(null); navigate('/swipe'); }}>
                  Go to Browse
                </Button>
              </div>
            ) : (
              savedRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => addRecipeToSlot(recipe.id, recipe.name, recipe.image)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left cursor-pointer border border-transparent hover:border-border"
                >
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-foreground truncate">{recipe.name}</span>
                  <Plus className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export PDF Dialog */}
      <AlertDialog open={exportDialog} onOpenChange={setExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Meal Plan to PDF</AlertDialogTitle>
            <AlertDialogDescription>
              Choose what you'd like to export. The PDF will include all meals and their ingredients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => exportPDF('week')}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Export Full Week
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map((day, di) => (
                <Button
                  key={di}
                  variant="outline"
                  size="sm"
                  onClick={() => exportPDF(di)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Sheet open={!!recipePreview} onOpenChange={(open) => !open && setRecipePreview(null)}>
        <SheetContent side="bottom" className="h-[88vh] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-left">{recipePreview?.name}</SheetTitle>
              {recipePreview?.sourceUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={recipePreview.sourceUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />Open in New Tab
                  </a>
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="h-[calc(88vh-64px)]">
            {recipePreview?.sourceUrl ? (
              <iframe
                title={recipePreview.name}
                src={recipePreview.sourceUrl}
                className="w-full h-full border-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full overflow-y-auto p-4">
                <p className="text-sm font-semibold mb-2">Instructions</p>
                <ol className="space-y-2 text-sm">
                  {(recipePreview?.instructions || []).map((step, idx) => (
                    <li key={idx}>{idx + 1}. {step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
