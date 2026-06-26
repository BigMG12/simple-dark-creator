import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col gap-4 p-8">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSkeleton />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
