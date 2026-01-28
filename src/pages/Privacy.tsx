import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const Privacy = () => {
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
          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>
            <p>
              We collect information that you provide directly to us, including when you create
              an account, use our services, or communicate with us. This may include your name,
              email address, and project-related data.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services,
              to process your transactions, to send you technical notices and support messages,
              and to communicate with you about products, services, and events.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Information Sharing</h2>
            <p>
              We do not share your personal information with third parties except as described
              in this policy. We may share information with service providers who perform services
              on our behalf, such as hosting and analytics.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Data Security</h2>
            <p>
              We take reasonable measures to help protect your personal information from loss,
              theft, misuse, unauthorized access, disclosure, alteration, and destruction.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. Data Retention</h2>
            <p>
              We store the information we collect for as long as is necessary for the purpose(s)
              for which we originally collected it. We may retain certain information for
              legitimate business purposes or as required by law.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information at any
              time. You can do this by logging into your account or contacting us directly.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our service
              and hold certain information. You can instruct your browser to refuse all cookies
              or to indicate when a cookie is being sent.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the "Last
              updated" date.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">9. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at
              privacy@renomate.app.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
