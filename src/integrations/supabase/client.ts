// Denna fil är nu ompekad till din centrala Supabase-klient
import { supabase as centralSupabase } from "@/lib/supabaseClient";

/**
 * Vi exporterar din befintliga, fungerande klient under namnet 'supabase'.
 * Detta gör att alla andra filer som importerar från denna fil 
 * (t.ex. import { supabase } from "@/integrations/supabase/client")
 * kommer att börja fungera direkt utan att krascha.
 */
export const supabase = centralSupabase;