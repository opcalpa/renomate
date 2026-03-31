import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Determines whether tax deduction features (ROT in Sweden) should be visible.
 *
 * Three-level resolution:
 * 1. **Project-level** (most specific): if `projectCountry` is provided, use it
 * 2. **Global/dashboard**: if user has ANY project with country=SE, show it
 * 3. **Fallback** (no projects yet): language=sv OR profile company_country=SE
 *
 * This ensures:
 * - Swedish user with English UI → sees ROT (via project country or profile)
 * - US user creating US project → no ROT
 * - US user with Swedish vacation home → sees ROT on that project only
 */
export function useTaxDeductionVisible(projectCountry?: string | null): {
  showTaxDeduction: boolean;
  isLoading: boolean;
} {
  const { i18n } = useTranslation();

  // If project-level country is provided, use it directly
  const projectResolved = projectCountry != null;

  // Fetch profile country + whether user has any SE project (for global context)
  const { data, isLoading } = useQuery({
    queryKey: ["tax-deduction-context"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { companyCountry: null, hasSwedishProject: false };

      const [profileRes, projectRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("company_country")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("projects")
          .select("id")
          .eq("country", "SE")
          .limit(1),
      ]);

      return {
        companyCountry: profileRes.data?.company_country ?? null,
        hasSwedishProject: (projectRes.data?.length ?? 0) > 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !projectResolved, // Skip fetch if project country already known
  });

  const showTaxDeduction = useMemo(() => {
    // Level 1: Project-specific country
    if (projectResolved) {
      return projectCountry === "SE";
    }

    // Level 2: User has at least one Swedish project
    if (data?.hasSwedishProject) return true;

    // Level 3: Fallback for users without projects yet
    if (i18n.language === "sv") return true;
    if (data?.companyCountry === "SE") return true;

    return false;
  }, [projectResolved, projectCountry, data, i18n.language]);

  return { showTaxDeduction, isLoading };
}
