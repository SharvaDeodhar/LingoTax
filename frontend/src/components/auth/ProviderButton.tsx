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
        "border border-gray-300 rounded-lg bg-white",
        "text-sm font-medium text-gray-700",
        "hover:bg-gray-50 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}
