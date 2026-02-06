import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

// Initialize Sentry for error tracking (only in production or when DSN is set)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance monitoring sample rate
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session Replay sample rate (10% in production)
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    // Error session sample rate (100% for errors)
    replaysOnErrorSampleRate: 1.0,
  });
}

// Expose supabase globally for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { supabase: typeof supabase }).supabase = supabase;
}

createRoot(document.getElementById("root")!).render(<App />);
