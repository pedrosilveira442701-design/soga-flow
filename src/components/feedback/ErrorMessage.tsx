import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

interface ErrorMessageProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ErrorMessage({ message, action }: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -2 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="animate-shake"
    >
      <Alert variant="destructive" className="border-brand-danger">
        <AlertCircle className="h-[18px] w-[18px]" />
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 break-words">{message}</span>
          {action && (
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="w-full sm:w-auto sm:ml-4 shrink-0"
            >
              {action.label}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}
