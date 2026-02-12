import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IntakeWizard } from "@/components/intake";
import {
  getIntakeRequestByToken,
  type IntakeRequestWithCreator,
} from "@/services/intakeService";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function CustomerIntake() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"expired" | "notFound" | null>(null);
  const [intakeRequest, setIntakeRequest] = useState<IntakeRequestWithCreator | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("notFound");
      setLoading(false);
      return;
    }

    loadIntakeRequest();
  }, [token]);

  const loadIntakeRequest = async () => {
    if (!token) return;

    try {
      const request = await getIntakeRequestByToken(token);

      if (!request) {
        setError("notFound");
      } else if (new Date(request.expires_at) < new Date()) {
        setError("expired");
      } else {
        setIntakeRequest(request);
      }
    } catch (err) {
      console.error("Failed to load intake request:", err);
      setError("notFound");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error states
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {error === "expired" ? t("intake.expired") : t("intake.notFound")}
              </AlertTitle>
              <AlertDescription>
                {error === "expired"
                  ? t("intake.expiredDescription")
                  : t("intake.notFoundDescription")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!intakeRequest) {
    return null;
  }

  const creatorName =
    intakeRequest.creator.company_name || intakeRequest.creator.name || "Contractor";
  const creatorInitials = creatorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={intakeRequest.creator.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {creatorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{creatorName}</p>
              <p className="text-xs text-muted-foreground">{t("intake.title")}</p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {!submitted ? (
          <IntakeWizard
            intakeRequest={intakeRequest}
            onSubmitted={() => setSubmitted(true)}
          />
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2">{t("intake.submittedTitle")}</h2>
              <p className="text-muted-foreground">
                {t("intake.submittedDescription", { company: creatorName })}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            {t("intake.poweredBy")}
          </p>
        </div>
      </footer>
    </div>
  );
}
