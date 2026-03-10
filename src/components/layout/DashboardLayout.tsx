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
      <main className={isMobile ? "pt-[52px] px-4 pb-6" : "pt-[60px] px-6 pb-8 max-w-[1440px] mx-auto"}>
        {children}
      </main>
    </div>
  );
}
