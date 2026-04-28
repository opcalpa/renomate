import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGuestMode } from "@/hooks/useGuestMode";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Allow guest users through (default: true for backwards compat) */
  allowGuest?: boolean;
}

/**
 * Route wrapper: redirects to /auth if user is not authenticated.
 * By default, guest users are allowed through — pass allowGuest={false}
 * to require a real login.
 */
export function RequireAuth({ children, allowGuest = true }: RequireAuthProps) {
  const { user, loading } = useAuthSession();
  const { isGuest } = useGuestMode();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAuthenticated = !!user || (allowGuest && isGuest);

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
