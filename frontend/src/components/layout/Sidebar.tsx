"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Files, User, Settings, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files",     label: "Files",     icon: Files },
  { href: "/help",      label: "Tax Help",  icon: MessageCircle },
  { href: "/profile",   label: "Profile",   icon: User },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-white border-r flex flex-col">
      {/* Brand */}
      <div className="px-5 py-4 border-b">
        <span className="text-lg font-bold text-blue-600">LingoTax</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
