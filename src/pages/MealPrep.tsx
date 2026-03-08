import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, X, Download, Calendar, CalendarDays, FileText, Table2, GripVertical } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';
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

  // Get saved recipes list
  const savedRecipes = useMemo(() => {
    return likedRecipes.map((id) => {
      const recipe = dbRecipes.find((r) => r.id === id) || savedApiRecipes[id];
      return recipe ? { id, name: recipe.name, image: recipe.image } : null;
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

    // Find or create meal plan
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
    // Update in DB
    await supabase.from('meal_plan_items').update({
      day_of_week: day,
      meal_type: meal,
    } as any).eq('id', dragItem.id);
    // Update local
    setItems(prev => prev.map(i =>
      i.id === dragItem.id ? { ...i, day_of_week: day, meal_type: meal } : i
    ));
    setDragItem(null);
  };

  // Export functions
  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text(`Meal Plan — Week of ${format(weekStart, 'MMM d, yyyy')}`, 14, 20);

    let y = 35;
    MEAL_TYPES.forEach((meal) => {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(meal.charAt(0).toUpperCase() + meal.slice(1), 14, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      DAYS.forEach((day, di) => {
        const dayItems = items.filter(i => i.day_of_week === di && i.meal_type === meal);
        const text = dayItems.length > 0
          ? dayItems.map(i => `${i.recipe_name} (${i.servings}p)`).join(', ')
          : '—';
        doc.text(`${day}: ${text}`, 20, y);
        y += 5;
      });
      y += 5;
    });

    doc.save(`meal-plan-${format(weekStart, 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'PDF exported! 📄' });
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

  const exportICS = () => {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Munch//Meal Plan//EN\n';
    DAYS.forEach((_, di) => {
      const date = addDays(weekStart, di);
      const dateStr = format(date, 'yyyyMMdd');
      MEAL_TYPES.forEach((meal) => {
        const dayItems = items.filter(i => i.day_of_week === di && i.meal_type === meal);
        dayItems.forEach((item) => {
          const hour = meal === 'breakfast' ? '08' : meal === 'lunch' ? '12' : meal === 'dinner' ? '18' : '15';
          ics += `BEGIN:VEVENT\nDTSTART:${dateStr}T${hour}0000\nDTEND:${dateStr}T${String(Number(hour) + 1).padStart(2, '0')}0000\nSUMMARY:${meal.charAt(0).toUpperCase() + meal.slice(1)}: ${item.recipe_name}\nDESCRIPTION:Servings: ${item.servings}\nEND:VEVENT\n`;
        });
      });
    });
    ics += 'END:VCALENDAR';
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal-plan-${format(weekStart, 'yyyy-MM-dd')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Calendar exported! 📅' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">Meal Prep</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={exportPDF}>
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
              <TooltipContent>Export as CSV</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={exportICS}>
                  <Calendar className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export to Calendar</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(prev => subWeeks(prev, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-medium text-foreground">
            {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(prev => addWeeks(prev, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
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
          {MEAL_TYPES.map((meal) => (
            DAYS.map((_, di) => {
              const slotItems = items.filter(i => i.day_of_week === di && i.meal_type === meal);
              return (
                <div
                  key={`${meal}-${di}`}
                  className="min-h-[80px] bg-card border border-border rounded-lg p-1.5 transition-colors"
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
                      className="bg-background rounded-md p-1.5 mb-1 border border-border cursor-grab active:cursor-grabbing shadow-sm group text-[11px]"
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
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setAddDialog({ day: di, meal })}
                    className="w-full text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-0.5 py-1 rounded hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* Add Recipe Dialog */}
      <Dialog open={!!addDialog} onOpenChange={(open) => !open && setAddDialog(null)}>
        <DialogContent className="max-w-sm max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>
              Add Recipe — {addDialog ? `${DAYS[addDialog.day]} ${addDialog.meal}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {savedRecipes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No saved recipes yet. Browse and save some first!
              </p>
            ) : (
              savedRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => addRecipeToSlot(recipe.id, recipe.name, recipe.image)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <img src={recipe.image} alt={recipe.name} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{recipe.name}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
