import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserRoleResult {
  role: string | null;
  loading: boolean;
}

/**
 * Returns the user's onboarding_user_type from profiles.
 * Cached via React Query with 5 min staleTime — avoids re-fetching on every route change.
 */
export function useUserRole(userId: string | undefined): UserRoleResult {
  const { data, isLoading } = useQuery({
    queryKey: ["user-role", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_user_type")
        .eq("user_id", userId!)
        .single();
      return data?.onboarding_user_type ?? null;
    },
    enabled: !!userId,
    staleTime: 300_000,
  });

  return {
    role: data ?? null,
    loading: isLoading && !!userId,
  };
}
