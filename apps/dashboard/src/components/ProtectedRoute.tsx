import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
        {/* Navbar Skeleton */}
        <header className="border-b border-border/80 bg-card h-16 flex items-center px-4 sm:px-8 justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>

        {/* Content Skeleton */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border border-border/80 bg-card">
            <div className="space-y-2">
              <Skeleton className="h-7 w-44 rounded-md" />
              <Skeleton className="h-4 w-72 rounded-md" />
            </div>
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((key) => (
              <div key={key} className="rounded-2xl border border-border/80 bg-card p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
                <div className="pt-4 border-t border-border/60 flex justify-between">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
