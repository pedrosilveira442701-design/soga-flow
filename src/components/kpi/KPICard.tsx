import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: {
    value: string;
    direction: "up" | "down";
  };
  variant?: "default" | "liquid";
  icon?: LucideIcon;
}

export function KPICard({ title, value, delta, variant = "default", icon: Icon }: KPICardProps) {
  const isLiquid = variant === "liquid";

  return (
    <Card
      className={cn(
        "p-6 transition-shadow duration-200 hover:shadow-elev2",
        "shadow-elev1",
        isLiquid && "border-brand-liquid/20"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-caption text-muted-foreground mb-2">{title}</p>
          <p
            className={cn(
              "text-3xl text-kpi mb-1",
              isLiquid ? "text-brand-liquid" : "text-foreground"
            )}
          >
            {value}
          </p>
          {delta && (
            <div
              className={cn(
                "flex items-center gap-1 text-[12px] font-medium",
                delta.direction === "up" ? "text-success" : "text-destructive"
              )}
            >
              {delta.direction === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{delta.value}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "p-3 rounded-lg",
              isLiquid ? "bg-brand-liquid/10" : "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isLiquid ? "text-brand-liquid" : "text-primary"
              )}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
