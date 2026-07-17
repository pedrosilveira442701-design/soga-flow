import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] sm:min-h-[400px] p-6 sm:p-8 text-center">
      <div className="mb-6 p-4 sm:p-6 rounded-full bg-muted">
        <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-h3 mb-2">{title}</h3>
      <p className="text-body text-muted-foreground max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="lg" className="w-full sm:w-auto">
          {action.label}
        </Button>
      )}
    </div>
  );
}
