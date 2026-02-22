"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Files, Bot, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files", label: "Files", icon: Files },
  { href: "/help", label: "AI Chat", icon: Bot },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#E2E8F0] flex items-center gap-2.5">
        <Image
          src="/favicon/favicon-32x32.png"
          alt="Logo"
          width={24}
          height={24}
        />
        <span className="text-lg font-extrabold bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] bg-clip-text text-transparent">
          LinguaTax
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] text-white shadow-ct-sm"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
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
