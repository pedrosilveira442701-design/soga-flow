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
      iconBg: "bg-primary/8",
      iconColor: "text-primary",
      valueColor: "text-foreground",
    },
    liquid: {
      iconBg: "bg-success/8",
      iconColor: "text-success",
      valueColor: "text-success",
    },
    danger: {
      iconBg: "bg-destructive/8",
      iconColor: "text-destructive",
      valueColor: "text-destructive",
    },
    success: {
      iconBg: "bg-success/8",
      iconColor: "text-success",
      valueColor: "text-success",
    },
    repouso: {
      iconBg: "bg-warning/8",
      iconColor: "text-warning",
      valueColor: "text-warning",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card className="p-5 hover:shadow-elev2 transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-caption mb-2 truncate">{title}</p>
          <p
            className={cn(
              "text-[26px] leading-[32px] text-kpi",
              styles.valueColor
            )}
          >
            {value}
          </p>
          {subValue && (
            <p className="text-[13px] text-muted-foreground mt-1">{subValue}</p>
          )}
          {delta && (
            <div
              className={cn(
                "flex items-center gap-1 text-[12px] font-medium mt-1.5",
                delta.direction === "up" ? "text-success" : "text-destructive"
              )}
            >
              {delta.direction === "up" ? (
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              <span>{delta.value}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "p-2.5 rounded-xl shrink-0 ml-3",
              styles.iconBg
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                styles.iconColor
              )}
              strokeWidth={1.75}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
