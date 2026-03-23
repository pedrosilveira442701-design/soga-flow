import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface ActionButtonProps extends Omit<ButtonProps, "size"> {
  icon: React.ReactNode;
  label: string;
}

/**
 * Standardized action button for table rows, cards, and forms.
 * Always h-10 w-10 with tooltip. Use this instead of <Button size="icon">.
 */
export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ icon, label, ...props }, ref) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button ref={ref} size="icon" aria-label={label} {...props}>
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  },
);
ActionButton.displayName = "ActionButton";
