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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-h1 flex items-center gap-3">
          {Icon && <Icon className="page-icon" />}
          {title}
        </h1>
        {subtitle && <p className="text-caption mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}
