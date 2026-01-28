import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const About = () => {
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
          <h1 className="text-4xl font-bold mb-6">About Renomate</h1>

          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <p>
              Renomate is a comprehensive project management platform designed specifically for
              homeowners and contractors managing renovation projects.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Our Mission</h2>
            <p>
              We believe that home renovation should be an exciting and manageable experience,
              not a stressful one. Our mission is to provide intuitive tools that help you
              organize, collaborate, and track every aspect of your renovation project.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">What We Offer</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Visual floor plan editor with 3D preview capabilities</li>
              <li>Task management with budget tracking and payment status</li>
              <li>Team collaboration with role-based permissions</li>
              <li>Material and purchase order management</li>
              <li>Multi-language support for international teams</li>
              <li>Real-time updates and progress tracking</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Why Choose Renomate</h2>
            <p>
              Whether you're renovating a single room or managing a complete home makeover,
              Renomate provides the structure and flexibility you need to stay organized,
              on budget, and on schedule.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
