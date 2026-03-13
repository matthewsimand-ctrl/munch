import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore, type KitchenSummary } from '@/lib/store';

interface KitchenInvite {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  kitchen_id: string;
}

interface KitchenMember {
  id: string;
  kitchen_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
  display_name: string | null;
}

export function useKitchens() {
  const { activeKitchenId, setActiveKitchen } = useStore();
  const [kitchens, setKitchens] = useState<KitchenSummary[]>([]);
  const [invites, setInvites] = useState<KitchenInvite[]>([]);
  const [membersByKitchen, setMembersByKitchen] = useState<Record<string, KitchenMember[]>>({});
  const [loading, setLoading] = useState(false);

  const loadKitchens = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        setKitchens([]);
        setInvites([]);
        return;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from('kitchen_memberships')
        .select('kitchen_id, role')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      const kitchenIds = (memberships || []).map((item: any) => item.kitchen_id);
      if (kitchenIds.length === 0) {
        setKitchens([]);
        setInvites([]);
        setActiveKitchen(null);
        return;
      }

      const { data: kitchenRows, error: kitchenError } = await supabase
        .from('kitchens')
        .select('id, name')
        .in('id', kitchenIds)
        .order('created_at', { ascending: true });

      if (kitchenError) throw kitchenError;

      const kitchenList: KitchenSummary[] = (kitchenRows || []).map((kitchen: any) => ({
        id: String(kitchen.id),
        name: String(kitchen.name),
        role: ((memberships || []).find((item: any) => item.kitchen_id === kitchen.id)?.role || 'viewer') as KitchenSummary['role'],
      }));

      setKitchens(kitchenList);

      if (!activeKitchenId || !kitchenList.some((kitchen) => kitchen.id === activeKitchenId)) {
        setActiveKitchen(kitchenList[0] || null);
      }

      const { data: inviteRows, error: inviteError } = await supabase
        .from('kitchen_invites')
        .select('id, email, role, status, kitchen_id')
        .in('kitchen_id', kitchenIds)
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;
      setInvites((inviteRows || []) as KitchenInvite[]);
    } finally {
      setLoading(false);
    }
  }, [activeKitchenId, setActiveKitchen]);

  useEffect(() => {
    void loadKitchens();
  }, [loadKitchens]);

  const createKitchen = useCallback(async (name: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error('Please sign in to create a kitchen.');

    const kitchenId = crypto.randomUUID();

    const { error: kitchenError } = await supabase
      .from('kitchens')
      .insert({ id: kitchenId, name, owner_user_id: user.id });

    if (kitchenError) throw kitchenError;

    const { error: membershipError } = await supabase
      .from('kitchen_memberships')
      .insert({ kitchen_id: kitchenId, user_id: user.id, role: 'owner', invited_by: user.id });

    if (membershipError) throw membershipError;

    await loadKitchens();
    const createdKitchen = { id: kitchenId, name, role: 'owner' as const };
    setActiveKitchen(createdKitchen);
    return createdKitchen;
  }, [loadKitchens, setActiveKitchen]);

  const inviteToKitchen = useCallback(async (kitchenId: string, email: string, role: KitchenInvite['role']) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error('Please sign in to send invites.');

    const { error } = await supabase
      .from('kitchen_invites')
      .insert({
        kitchen_id: kitchenId,
        email,
        role,
        invited_by: user.id,
      });

    if (error) throw error;
    await loadKitchens();
  }, [loadKitchens]);

  const loadKitchenMembers = useCallback(async (kitchenId: string) => {
    const { data: membershipRows, error: membershipError } = await supabase
      .from('kitchen_memberships')
      .select('id, kitchen_id, user_id, role, created_at')
      .eq('kitchen_id', kitchenId)
      .order('created_at', { ascending: true });

    if (membershipError) throw membershipError;

    const userIds = Array.from(new Set((membershipRows || []).map((row: any) => String(row.user_id))));
    let nameMap: Record<string, string | null> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      nameMap = Object.fromEntries(
        (profiles || []).map((profile: any) => [String(profile.user_id), profile.display_name ? String(profile.display_name) : null]),
      );
    }

    const members: KitchenMember[] = (membershipRows || []).map((row: any) => ({
      id: String(row.id),
      kitchen_id: String(row.kitchen_id),
      user_id: String(row.user_id),
      role: row.role as KitchenMember['role'],
      created_at: String(row.created_at),
      display_name: nameMap[String(row.user_id)] || null,
    }));

    setMembersByKitchen((current) => ({
      ...current,
      [kitchenId]: members,
    }));

    return members;
  }, []);

  const updateKitchenMemberRole = useCallback(async (
    membershipId: string,
    kitchenId: string,
    role: KitchenMember['role'],
  ) => {
    const { error } = await supabase
      .from('kitchen_memberships')
      .update({ role })
      .eq('id', membershipId);

    if (error) throw error;
    await loadKitchenMembers(kitchenId);
  }, [loadKitchenMembers]);

  const removeKitchenMember = useCallback(async (membershipId: string, kitchenId: string) => {
    const { error } = await supabase
      .from('kitchen_memberships')
      .delete()
      .eq('id', membershipId);

    if (error) throw error;
    await loadKitchenMembers(kitchenId);
    await loadKitchens();
  }, [loadKitchenMembers, loadKitchens]);

  return {
    kitchens,
    invites,
    membersByKitchen,
    loading,
    loadKitchens,
    createKitchen,
    inviteToKitchen,
    loadKitchenMembers,
    updateKitchenMemberRole,
    removeKitchenMember,
  };
}
