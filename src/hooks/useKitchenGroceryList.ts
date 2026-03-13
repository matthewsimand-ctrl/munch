import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KitchenGroceryItem {
  id: string;
  grocery_list_id: string;
  name: string;
  quantity: string;
  category?: string | null;
  section?: string | null;
  checked: boolean;
}

export function useKitchenGroceryList(activeKitchenId: string | null) {
  const [groceryListId, setGroceryListId] = useState<string | null>(null);
  const [items, setItems] = useState<KitchenGroceryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeKitchenId) {
      setGroceryListId(null);
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      let { data: list, error: listError } = await supabase
        .from('kitchen_grocery_lists')
        .select('id')
        .eq('kitchen_id', activeKitchenId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (listError) throw listError;

      if (!list) {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) {
          setItems([]);
          return;
        }

        const { data: createdList, error: createError } = await supabase
          .from('kitchen_grocery_lists')
          .insert({
            kitchen_id: activeKitchenId,
            name: 'Shared Grocery List',
            created_by: user.id,
            is_active: true,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        list = createdList;
      }

      setGroceryListId(String(list.id));

      const { data: itemRows, error: itemError } = await supabase
        .from('kitchen_grocery_items')
        .select('id, grocery_list_id, name, quantity, category, section, checked')
        .eq('grocery_list_id', list.id)
        .order('created_at', { ascending: true });

      if (itemError) throw itemError;
      setItems((itemRows || []) as KitchenGroceryItem[]);
    } finally {
      setLoading(false);
    }
  }, [activeKitchenId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addItem = useCallback(async (input: { name: string; quantity: string; category?: string; section?: string }) => {
    if (!groceryListId) return;

    const normalized = input.name.toLowerCase().trim();
    const existing = items.find((item) => item.name === normalized);

    if (existing) {
      await updateItem(existing.id, {
        quantity: input.quantity || existing.quantity,
        category: input.category ?? existing.category ?? undefined,
        section: input.section ?? existing.section ?? undefined,
      });
      return;
    }

    const { error } = await supabase.from('kitchen_grocery_items').insert({
      grocery_list_id: groceryListId,
      name: normalized,
      quantity: input.quantity,
      category: input.category ?? null,
      section: input.section ?? null,
      checked: false,
    });

    if (error) throw error;
    await load();
  }, [groceryListId, items, load]);

  const updateItem = useCallback(async (id: string, updates: Partial<Pick<KitchenGroceryItem, 'quantity' | 'category' | 'section' | 'checked' | 'name'>>) => {
    const payload: Record<string, unknown> = { ...updates };
    if (typeof payload.name === 'string') payload.name = payload.name.toLowerCase().trim();
    const { error } = await supabase.from('kitchen_grocery_items').update(payload).eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const removeItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('kitchen_grocery_items').delete().eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const clearChecked = useCallback(async () => {
    if (!groceryListId) return;
    const { error } = await supabase.from('kitchen_grocery_items').delete().eq('grocery_list_id', groceryListId).eq('checked', true);
    if (error) throw error;
    await load();
  }, [groceryListId, load]);

  const clearAll = useCallback(async () => {
    if (!groceryListId) return;
    const { error } = await supabase.from('kitchen_grocery_items').delete().eq('grocery_list_id', groceryListId);
    if (error) throw error;
    await load();
  }, [groceryListId, load]);

  return useMemo(() => ({
    groceryListId,
    items,
    loading,
    load,
    addItem,
    updateItem,
    removeItem,
    clearChecked,
    clearAll,
  }), [groceryListId, items, loading, load, addItem, updateItem, removeItem, clearChecked, clearAll]);
}
