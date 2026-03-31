"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FileText,
  Eye,
  Settings,
  LogOut,
  PenTool,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "New Scan", icon: Search },
  { href: "/content", label: "Content Library", icon: FileText },
  { href: "/content/generate", label: "Generate Content", icon: PenTool },
  { href: "/competitors", label: "Competitor Watchdog", icon: Eye },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const nav = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-electric-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">LA</span>
          </div>
          <span className="text-lg font-semibold text-[var(--foreground)]">
            Geothority
          </span>
        </Link>
      </div>

      {/* Nav Items */}
      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-electric-500/10 text-electric-500"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Sign Out */}
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[var(--card)] border-r border-[var(--border)] flex-col fixed inset-y-0 left-0 z-40">
        {nav}
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--card)] border-b border-[var(--border)] flex items-center px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 rounded-md bg-electric-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">LA</span>
          </div>
          <span className="font-semibold text-sm">Geothority</span>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-[var(--card)] border-r border-[var(--border)] z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="w-5 h-5" />
            </button>
            {nav}
          </aside>
        </>
      )}
    </>
  );
}
