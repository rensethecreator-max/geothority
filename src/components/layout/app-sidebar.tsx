"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Search,
  FileText,
  Eye,
  Radar,
  Settings,
  LogOut,
  PenTool,
  Menu,
  X,
  Building2,
  CreditCard,
  Shield,
  Bell,
  BarChart3,
  Code,
  Sparkles,
  ClipboardList,
  MapPin,
  Globe,
  Crosshair,
  Target,
  TrendingUp,
  Send,
  MessageSquareMore,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NotificationCenter from "@/components/saas/NotificationCenter";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/action-center", label: "Action Center", icon: Activity },
  { href: "/scan", label: "New Scan", icon: Search },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/content", label: "Content Library", icon: FileText },
  { href: "/content/generate", label: "Generate Content", icon: PenTool },
  { href: "/competitors", label: "Competitor Watchdog", icon: Eye },
  { href: "/gbp-monitor", label: "GBP Monitor", icon: Radar },
  { href: "/gbp-posts", label: "GBP Posts", icon: PenTool },
  { href: "/gbp-health", label: "GBP Connection", icon: Shield },
  { href: "/citations", label: "Citation Control", icon: MapPin },
  { href: "/nap-push", label: "NAP Push", icon: Send },
  { href: "/trust-score", label: "Trust Score", icon: Shield },
  { href: "/reputation", label: "Reputation Engine", icon: MessageSquareMore },
  { href: "/schema-generator", label: "Schema Generator", icon: Code },
  { href: "/settings/embed", label: "Install on Your Site", icon: Globe },
  { href: "/expansion", label: "Smart Expansion", icon: TrendingUp },
  { href: "/keyword-research", label: "Keyword Research", icon: Crosshair },
  { href: "/serp-features", label: "SERP Optimizer", icon: Target },
  { href: "/ai-overview", label: "AI Overview ⭐", icon: Sparkles },
  { href: "/ai-visibility", label: "AI Scorecard", icon: TrendingUp },
  { href: "/settings/api-keys", label: "API Keys", icon: Code },
  { href: "/google-business", label: "Google Business", icon: Building2 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/admin/diagnostics", label: "Diagnostics", icon: Shield },
  { href: "/admin/analytics", label: "Analytics", icon: LayoutDashboard },
  { href: "/admin/email-journey", label: "Email Journey", icon: FileText },
  { href: "/admin/push", label: "Push Notifications", icon: Bell },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setUserEmail(data.user?.email ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUserEmail(session?.user?.email ?? null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const isAdmin = useMemo(() => {
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    return userEmail ? adminEmails.includes(userEmail.toLowerCase()) : false;
  }, [userEmail]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const nav = (
    <nav className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <Image src="/logo.svg" alt="Geothority" width={36} height={36} className="w-9 h-9 rounded-lg object-contain" />
          <span className="text-lg font-semibold text-[var(--foreground)]">
            Geothority
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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

        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
            </div>
            {adminNavItems.map((item) => {
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
          </>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors w-full disabled:opacity-60"
        >
          <LogOut className="w-4 h-4" />
          {isSigningOut ? "Signing Out…" : "Sign Out"}
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:flex w-64 bg-[var(--card)] border-r border-[var(--border)] flex-col fixed inset-y-0 left-0 z-40">
        {nav}
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--card)] border-b border-[var(--border)] flex items-center px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-3 flex-1">
          <div className="w-7 h-7 rounded-md bg-electric-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">G</span>
          </div>
          <span className="font-semibold text-sm">Geothority</span>
        </div>
        <NotificationCenter />
      </div>

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
