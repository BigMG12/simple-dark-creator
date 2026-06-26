import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Skeleton className="h-96 w-full max-w-sm" />
    </div>
  );
}

const PublicOnlyRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSkeleton />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

export default PublicOnlyRoute;
