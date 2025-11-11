import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  delta?: {
    value: string;
    direction: "up" | "down";
  };
  variant?: "default" | "liquid" | "danger" | "success" | "repouso";
  icon?: LucideIcon;
}

export function KPICard({ title, value, subValue, delta, variant = "default", icon: Icon }: KPICardProps) {
  const variantStyles = {
    default: {
      border: "",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      valueColor: "text-foreground",
    },
    liquid: {
      border: "border-brand-liquid/20",
      iconBg: "bg-brand-liquid/10",
      iconColor: "text-brand-liquid",
      valueColor: "text-brand-liquid",
    },
    danger: {
      border: "border-destructive/20",
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
      valueColor: "text-destructive",
    },
    success: {
      border: "border-success/20",
      iconBg: "bg-success/10",
      iconColor: "text-success",
      valueColor: "text-success",
    },
    repouso: {
      border: "border-warning/20",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      valueColor: "text-warning",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "p-6 transition-shadow duration-200 hover:shadow-elev2",
        "shadow-elev1",
        styles.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-caption text-muted-foreground mb-2">{title}</p>
          <p
            className={cn(
              "text-3xl text-kpi mb-1",
              styles.valueColor
            )}
          >
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-muted-foreground mb-1">{subValue}</p>
          )}
          {delta && (
            <div
              className={cn(
                "flex items-center gap-1 text-[12px] font-medium",
                delta.direction === "up" ? "text-success" : "text-destructive"
              )}
            >
              {delta.direction === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{delta.value}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "p-3 rounded-lg",
              styles.iconBg
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                styles.iconColor
              )}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
