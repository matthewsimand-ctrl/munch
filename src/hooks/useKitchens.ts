import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore, type KitchenSummary } from '@/lib/store';

interface KitchenInvite {
  id: string;
  email: string | null;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  kitchen_id: string;
  created_at: string;
  invite_token: string;
  expires_at: string | null;
}

interface KitchenMember {
  id: string;
  kitchen_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
  display_name: string | null;
  username: string | null;
}

export function useKitchens() {
  const { activeKitchenId, kitchenViewMode, setActiveKitchen } = useStore();
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

      if (kitchenViewMode === 'solo') {
        setActiveKitchen(null);
      } else if (!activeKitchenId || !kitchenList.some((kitchen) => kitchen.id === activeKitchenId)) {
        setActiveKitchen(kitchenList[0] || null);
      }

      const { data: inviteRows, error: inviteError } = await supabase
        .from('kitchen_invites')
        .select('id, email, role, status, kitchen_id, created_at, invite_token, expires_at')
        .in('kitchen_id', kitchenIds)
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;
      setInvites((inviteRows || []) as KitchenInvite[]);
    } finally {
      setLoading(false);
    }
  }, [activeKitchenId, kitchenViewMode, setActiveKitchen]);

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

  const inviteToKitchen = useCallback(async (kitchenId: string, email: string | null, role: KitchenInvite['role']) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error('Please sign in to send invites.');

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

    const { data, error } = await supabase
      .from('kitchen_invites')
      .insert({
        kitchen_id: kitchenId,
        email,
        role,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select('id, email, role, status, kitchen_id, created_at, invite_token, expires_at')
      .single();

    if (error) throw error;
    await loadKitchens();
    return data as KitchenInvite;
  }, [loadKitchens]);

  const resendInvite = useCallback(async (inviteId: string) => {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

    const { data, error } = await supabase
      .from('kitchen_invites')
      .update({
        status: 'pending',
        invite_token: crypto.randomUUID(),
        expires_at: expiresAt,
      })
      .eq('id', inviteId)
      .select('id, email, role, status, kitchen_id, created_at, invite_token, expires_at')
      .single();

    if (error) throw error;
    await loadKitchens();
    return data as KitchenInvite;
  }, [loadKitchens]);

  const loadKitchenMembers = useCallback(async (kitchenId: string) => {
    const { data: membershipRows, error: membershipError } = await supabase
      .from('kitchen_memberships')
      .select('id, kitchen_id, user_id, role, created_at')
      .eq('kitchen_id', kitchenId)
      .order('created_at', { ascending: true });

    if (membershipError) throw membershipError;

    const userIds = Array.from(new Set((membershipRows || []).map((row: any) => String(row.user_id))));
    let profileMap: Record<string, { display_name: string | null; username: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', userIds);

      profileMap = Object.fromEntries(
        (profiles || []).map((profile: any) => [String(profile.user_id), {
          display_name: profile.display_name ? String(profile.display_name) : null,
          username: profile.username ? String(profile.username) : null,
        }]),
      );
    }

    const members: KitchenMember[] = (membershipRows || []).map((row: any) => ({
      id: String(row.id),
      kitchen_id: String(row.kitchen_id),
      user_id: String(row.user_id),
      role: row.role as KitchenMember['role'],
      created_at: String(row.created_at),
      display_name: profileMap[String(row.user_id)]?.display_name || null,
      username: profileMap[String(row.user_id)]?.username || null,
    }));

    setMembersByKitchen((current) => ({
      ...current,
      [kitchenId]: members,
    }));

    return members;
  }, []);

  const addKitchenMemberByUsername = useCallback(async (
    kitchenId: string,
    username: string,
    role: 'editor' | 'viewer',
  ) => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) throw new Error('Enter a username first.');

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error('Please sign in to send invites.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, display_name, username')
      .eq('username', normalized)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.user_id) throw new Error(`No Munch user found for @${normalized}.`);
    if (profile.user_id === user.id) throw new Error('You are already in this kitchen.');

    const { error } = await supabase
      .from('kitchen_memberships')
      .upsert({
        kitchen_id: kitchenId,
        user_id: profile.user_id,
        role,
        invited_by: user.id,
      }, { onConflict: 'kitchen_id,user_id' });

    if (error) throw error;

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', user.id)
      .maybeSingle();

    const inviterName = inviterProfile?.display_name?.trim() || inviterProfile?.username || 'A Munch cook';

    await supabase
      .from('app_notifications')
      .insert({
        user_id: profile.user_id,
        type: 'kitchen_invite',
        title: 'You were added to a kitchen',
        body: `${inviterName} added you to a kitchen as ${role}.`,
        metadata: {
          kitchen_id: kitchenId,
          kitchen_name: kitchens.find((kitchen) => kitchen.id === kitchenId)?.name || '',
          role,
          invited_by: user.id,
        },
      });

    await Promise.all([loadKitchens(), loadKitchenMembers(kitchenId)]);
    return {
      user_id: String(profile.user_id),
      display_name: profile.display_name ? String(profile.display_name) : null,
      username: profile.username ? String(profile.username) : normalized,
    };
  }, [kitchens, loadKitchenMembers, loadKitchens]);

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

  const leaveKitchen = useCallback(async (kitchenId: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error('Please sign in to leave a kitchen.');

    const { data: membership, error: membershipError } = await supabase
      .from('kitchen_memberships')
      .select('id, role')
      .eq('kitchen_id', kitchenId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership?.id) throw new Error('You are not a member of this kitchen.');

    if (membership.role === 'owner') {
      const { count, error: countError } = await supabase
        .from('kitchen_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('kitchen_id', kitchenId);

      if (countError) throw countError;

      if ((count || 0) > 1) {
        throw new Error('Owners need to remove other members before leaving this kitchen.');
      }

      const { error: deleteKitchenError } = await supabase
        .from('kitchens')
        .delete()
        .eq('id', kitchenId);

      if (deleteKitchenError) throw deleteKitchenError;
    } else {
      const { error: deleteMembershipError } = await supabase
        .from('kitchen_memberships')
        .delete()
        .eq('id', membership.id);

      if (deleteMembershipError) throw deleteMembershipError;
    }

    setActiveKitchen(null);
    await loadKitchens();
  }, [loadKitchens, setActiveKitchen]);

  return {
    kitchens,
    invites,
    membersByKitchen,
    loading,
    loadKitchens,
    createKitchen,
    inviteToKitchen,
    addKitchenMemberByUsername,
    resendInvite,
    loadKitchenMembers,
    updateKitchenMemberRole,
    removeKitchenMember,
    leaveKitchen,
  };
}
