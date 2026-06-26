import { AppNav } from "@/components/nav/AppNav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <AppNav />
      <main className="lg:pl-60 pb-28 lg:pb-12 page-fade">{children}</main>
    </div>
  );
}
