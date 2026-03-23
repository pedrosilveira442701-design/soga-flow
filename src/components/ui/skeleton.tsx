import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md overflow-hidden relative bg-muted", className)}
      {...props}
    >
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:1000px_100%]" />
    </div>
  );
}

export { Skeleton };
