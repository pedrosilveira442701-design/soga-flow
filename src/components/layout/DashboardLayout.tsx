import { Topbar } from "./Topbar";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <main className={isMobile ? "pt-14 p-4" : "pt-[72px] p-6"}>
        {children}
      </main>
    </div>
  );
}
