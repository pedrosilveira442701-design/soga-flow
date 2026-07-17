import * as React from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-h1 flex items-center gap-3">
          {Icon && <Icon className="page-icon shrink-0" />}
          {title}
        </h1>
        {subtitle && <p className="text-caption mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}
