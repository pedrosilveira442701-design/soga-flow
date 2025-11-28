import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "./NotificationBell";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with Sidebar Trigger and Notifications */}
          <header className="sticky top-0 z-10 h-14 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 flex items-center justify-between gap-4">
            <SidebarTrigger className="-ml-1" />
            <NotificationBell />
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
