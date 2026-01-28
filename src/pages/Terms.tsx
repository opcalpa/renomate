import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="Renomate" className="h-10 w-auto" />
          </div>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Renomate, you accept and agree to be bound by the terms
              and provision of this agreement.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily use Renomate for personal, non-commercial
              renovation project management purposes. This is the grant of a license, not a
              transfer of title.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. User Account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password
              and for restricting access to your account. You agree to accept responsibility for
              all activities that occur under your account.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Privacy</h2>
            <p>
              Your use of Renomate is also governed by our Privacy Policy. Please review our
              Privacy Policy to understand our practices.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. Modifications</h2>
            <p>
              Renomate reserves the right to modify or replace these Terms at any time. It is
              your responsibility to check these Terms periodically for changes.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the service immediately,
              without prior notice or liability, under our sole discretion, for any reason
              whatsoever and without limitation.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Limitation of Liability</h2>
            <p>
              In no event shall Renomate, nor its directors, employees, partners, agents,
              suppliers, or affiliates, be liable for any indirect, incidental, special,
              consequential or punitive damages.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us at
              support@renomate.app.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
