import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Determines whether tax deduction features (ROT in Sweden) should be visible.
 *
 * Currently supports:
 * - SE (Sweden): ROT-avdrag
 *
 * Returns `true` if the user's locale is Swedish OR their profile country is SE.
 * This ensures Swedish users with English UI still see ROT.
 */
export function useTaxDeductionVisible(): {
  showTaxDeduction: boolean;
  isLoading: boolean;
  countryCode: string;
} {
  const { i18n } = useTranslation();

  const { data: companyCountry, isLoading } = useQuery({
    queryKey: ["profile-country"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("company_country")
        .eq("user_id", user.id)
        .single();
      return data?.company_country ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const countryCode = companyCountry ?? (i18n.language === "sv" ? "SE" : "");

  const showTaxDeduction = useMemo(() => {
    // Swedish language → always show (covers homeowners without company_country)
    if (i18n.language === "sv") return true;
    // Profile explicitly set to Sweden
    if (companyCountry === "SE") return true;
    return false;
  }, [i18n.language, companyCountry]);

  return { showTaxDeduction, isLoading, countryCode };
}
