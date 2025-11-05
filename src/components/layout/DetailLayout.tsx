import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface DetailLayoutProps {
  children: ReactNode;
  financialSummary: ReactNode;
}

export function DetailLayout({ children, financialSummary }: DetailLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Content - 70% */}
      <div className="lg:col-span-8 space-y-6">{children}</div>

      {/* Financial Summary - 30% - Fixed on scroll */}
      <div className="lg:col-span-4">
        <div className="sticky top-24">
          <Card className="p-6 shadow-elev2">{financialSummary}</Card>
        </div>
      </div>
    </div>
  );
}
