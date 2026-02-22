"use client";

import { cn } from "@/lib/utils";

interface ProviderButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ProviderButton({
  onClick,
  disabled,
  children,
  className,
}: ProviderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-center gap-3 px-4 py-3",
        "border border-[#E2E8F0] rounded-xl bg-white shadow-ct-sm",
        "text-sm font-semibold text-[#0F172A]",
        "hover:shadow-ct-card hover:border-[#2F8AE5]/30 transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}
