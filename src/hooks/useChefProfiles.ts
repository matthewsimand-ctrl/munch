import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChefProfile {
  display_name: string | null;
  avatar_url: string | null;
}

// Cache of chef profiles to avoid repeated lookups
export function useChefProfiles(userIds: (string | null | undefined)[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))] as string[];

  return useQuery<Record<string, ChefProfile>>({
    queryKey: ['chef-profiles', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', uniqueIds);
      if (error) throw error;
      const map: Record<string, ChefProfile> = {};
      for (const p of data || []) {
        map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      }
      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 1000 * 60 * 10,
  });
}
