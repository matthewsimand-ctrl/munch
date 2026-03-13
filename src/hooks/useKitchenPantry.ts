import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KitchenPantryItem {
  id: string;
  kitchen_id: string;
  name: string;
  quantity: string;
  category?: string | null;
}

export function useKitchenPantry(activeKitchenId: string | null) {
  const [items, setItems] = useState<KitchenPantryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeKitchenId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kitchen_pantry_items')
        .select('id, kitchen_id, name, quantity, category')
        .eq('kitchen_id', activeKitchenId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems((data || []) as KitchenPantryItem[]);
    } finally {
      setLoading(false);
    }
  }, [activeKitchenId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addItem = useCallback(async (input: { name: string; quantity: string; category?: string }) => {
    if (!activeKitchenId) return;

    const normalized = input.name.toLowerCase().trim();
    const existing = items.find((item) => item.name === normalized);

    if (existing) {
      const currentQty = Number.parseFloat(existing.quantity || '');
      const addedQty = Number.parseFloat(input.quantity || '');

      await updateItem(existing.id, {
        quantity:
          Number.isFinite(currentQty) && Number.isFinite(addedQty)
            ? String(currentQty + addedQty)
            : existing.quantity || input.quantity,
        category: input.category ?? existing.category ?? undefined,
      });
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    const { error } = await supabase
      .from('kitchen_pantry_items')
      .insert({
        kitchen_id: activeKitchenId,
        name: normalized,
        quantity: input.quantity,
        category: input.category ?? null,
        added_by: user?.id ?? null,
      });

    if (error) throw error;
    await load();
  }, [activeKitchenId, items, load]);

  const updateItem = useCallback(async (id: string, updates: Partial<Pick<KitchenPantryItem, 'name' | 'quantity' | 'category'>>) => {
    const payload: Record<string, unknown> = { ...updates };
    if (typeof payload.name === 'string') payload.name = payload.name.toLowerCase().trim();
    const { error } = await supabase.from('kitchen_pantry_items').update(payload).eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const removeItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('kitchen_pantry_items').delete().eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  return useMemo(() => ({
    items,
    loading,
    load,
    addItem,
    updateItem,
    removeItem,
  }), [items, loading, load, addItem, updateItem, removeItem]);
}
