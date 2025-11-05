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
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          {action && (
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="ml-4"
            >
              {action.label}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}
