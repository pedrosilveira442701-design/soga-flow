import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-8 text-center", className)}>
      {Icon && (
        <div className="p-4 rounded-2xl bg-muted/60 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-[15px] font-semibold text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-[13px] text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
