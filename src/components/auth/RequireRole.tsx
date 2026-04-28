import { Navigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

type UserRole = "contractor" | "homeowner";

interface RequireRoleProps {
  children: React.ReactNode;
  /** Which role(s) can access this route */
  allow: UserRole | UserRole[];
  /** Where to redirect if role doesn't match (default: /start) */
  fallback?: string;
}

/**
 * Route wrapper: checks profile.onboarding_user_type against allowed roles.
 * Redirects to /start if user doesn't have the required role.
 *
 * Must be used inside RequireAuth (assumes user is authenticated).
 */
export function RequireRole({ children, allow, fallback = "/start" }: RequireRoleProps) {
  const { user } = useAuthSession();
  const { role, loading } = useUserRole(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allowed = Array.isArray(allow) ? allow : [allow];

  if (!role || !allowed.includes(role as UserRole)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
