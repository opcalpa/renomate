import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Supabase handles the token exchange via URL hash automatically.
    // We just need to check if a session exists after a short delay.
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setConfirmed(!!session);
      setChecking(false);

      // Auto-redirect after 3 seconds if confirmed
      if (session) {
        setTimeout(() => navigate("/start"), 3000);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center">
          <img src="/brand/svg/lockup/horizontal-ink.svg" alt="Renofine" className="h-8" />
        </div>

        {checking ? (
          <div className="space-y-3">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <p className="text-muted-foreground">Verifierar...</p>
          </div>
        ) : confirmed ? (
          <div className="space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">E-post verifierad!</h1>
            <p className="text-muted-foreground">
              Ditt konto är aktiverat. Du skickas vidare automatiskt...
            </p>
            <Button onClick={() => navigate("/start")} className="w-full">
              Kom igång
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Något gick fel</h1>
            <p className="text-muted-foreground">
              Verifieringslänken kan ha gått ut. Försök logga in — om kontot inte är verifierat kan du begära en ny länk.
            </p>
            <Button onClick={() => navigate("/auth")} variant="outline" className="w-full">
              Gå till inloggning
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
