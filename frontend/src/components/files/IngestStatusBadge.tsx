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
  pending:    { label: "Pending",    classes: "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]" },
  processing: { label: "Processing", classes: "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse" },
  ready:      { label: "Ready",      classes: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" },
  error:      { label: "Error",      classes: "bg-red-50 text-red-600 border border-red-200" },
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
