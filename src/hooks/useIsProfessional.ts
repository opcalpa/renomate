import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";

export function useIsProfessional() {
  const { user } = useAuthSession();
  const [isProfessional, setIsProfessional] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsProfessional(false);
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("is_professional")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setIsProfessional(data?.is_professional ?? false);
        setLoading(false);
      });
  }, [user]);

  return { isProfessional, loading };
}
