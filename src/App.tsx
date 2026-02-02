import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/i18n/config";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import InvitationResponse from "./pages/InvitationResponse";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import PinterestCallback from "./pages/PinterestCallback";
import Tips from "./pages/Tips";
import Feedback from "./pages/Feedback";
import FindProfessionals from "./pages/FindProfessionals";
import CreateQuote from "./pages/CreateQuote";
import ViewQuote from "./pages/ViewQuote";
import ClientRegistry from "./pages/ClientRegistry";
import { HelpBot } from "./components/HelpBot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/invitation" element={<InvitationResponse />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/pinterest/callback" element={<PinterestCallback />} />
          <Route path="/tips" element={<Tips />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/find-pros" element={<FindProfessionals />} />
          <Route path="/quotes/new" element={<CreateQuote />} />
          <Route path="/quotes/:quoteId" element={<ViewQuote />} />
          <Route path="/clients" element={<ClientRegistry />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <HelpBot />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
