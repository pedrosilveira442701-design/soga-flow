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
      <main className={isMobile ? "pt-[calc(110px_+_env(safe-area-inset-top))] px-3 pb-[max(24px,env(safe-area-inset-bottom))]" : "pt-[64px] px-6 pb-8 max-w-[1440px] mx-auto"}>
        {children}
      </main>
    </div>
  );
}
