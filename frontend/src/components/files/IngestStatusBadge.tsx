import { cn } from "@/lib/utils";
import type { IngestStatus } from "@/types";

interface IngestStatusBadgeProps {
  status: IngestStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  IngestStatus,
  { label: string; classes: string }
> = {
  pending:    { label: "Pending",    classes: "bg-gray-100 text-gray-600" },
  processing: { label: "Processing", classes: "bg-yellow-100 text-yellow-700 animate-pulse" },
  ready:      { label: "Ready",      classes: "bg-green-100 text-green-700" },
  error:      { label: "Error",      classes: "bg-red-100 text-red-700" },
};

export function IngestStatusBadge({ status, className }: IngestStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
