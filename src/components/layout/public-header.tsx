"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo href="/" size={36} />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Features
            </Link>
            <Link
              href="/for/insurance-agents"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Insurance Agents
            </Link>
            <Link
              href="/pricing"
              className={`text-sm transition-colors ${
                pathname === "/pricing"
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-electric-500 hover:bg-electric-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Get Your Free Scan
            </Link>
          </nav>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-[var(--muted-foreground)]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-[var(--border)]">
            <Link
              href="/#features"
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Features
            </Link>
            <Link
              href="/for/insurance-agents"
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Insurance Agents
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="block bg-electric-500 text-white text-center px-4 py-2 rounded-lg text-sm font-medium"
            >
              Get Your Free Scan
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
