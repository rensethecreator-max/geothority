"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Receipt,
  Loader2,
} from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionData {
  status: string;
  subscription: {
    plan: string;
    stripeCustomerId: string | null;
  } | null;
}

const PLAN_LABELS: Record<string, { name: string; color: string; summary: string }> = {
  free: { name: "Free", color: "bg-muted text-muted-foreground", summary: "Starter access for initial audits and baseline score tracking." },
  audit: { name: "Audit Only", color: "bg-amber-500/20 text-amber-300", summary: "Focused audit access for solo operators validating territory health." },
  starter: { name: "Starter", color: "bg-electric-500/20 text-electric-400", summary: "Built for individual operators who need recurring local authority visibility." },
  pro: { name: "Pro", color: "bg-purple-500/20 text-purple-300", summary: "Unlimited audits, stronger monitoring, and faster action loops." },
  growth: { name: "Growth", color: "bg-electric-500/20 text-electric-400", summary: "Broader monitoring, execution support, and premium reporting depth." },
  authority: { name: "Authority", color: "bg-indigo-500/20 text-indigo-300", summary: "Multi-location visibility, white-label reporting, and stronger operational control." },
  agency: { name: "Agency", color: "bg-emerald-500/20 text-emerald-300", summary: "Highest-tier coverage for client portfolios and multi-market operations." },
};

export default function BillingPortalPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { data, isLoading, isError, error } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/subscription"],
    queryFn: async () => {
      const response = await fetch("/api/billing/subscription");
      if (!response.ok) return { status: "none", subscription: null };
      return response.json();
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/create-portal-session", {
        returnPath: "/billing",
      });
      const payload = await response.json();
      if (payload.url) {
        window.location.href = payload.url;
      } else {
        throw new Error(payload.error ?? "Failed to open billing portal");
      }
    },
    onError: (mutationError: Error) => {
      toast({ title: "Error", description: mutationError.message, variant: "destructive" });
    },
  });

  const plan = data?.subscription?.plan ?? "free";
  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const hasBilling = !!data?.subscription?.stripeCustomerId;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
          <Skeleton className="geo-shimmer mb-4 h-3 w-28 bg-[var(--muted)]" />
          <Skeleton className="geo-shimmer h-9 w-56 bg-[var(--muted)]" />
          <Skeleton className="geo-shimmer mt-3 h-4 w-96 max-w-full bg-[var(--muted)]" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="geo-premium-card rounded-3xl p-6">
              <Skeleton className="geo-shimmer mb-4 h-6 w-32 bg-[var(--muted)]" />
              <Skeleton className="geo-shimmer h-16 w-full bg-[var(--muted)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-500">
              <Receipt className="h-3.5 w-3.5" />
              Revenue operations
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Billing & Subscription</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              Manage your plan, payment portal access, and upgrade path without leaving the Geothority command center.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Current tier", value: planInfo.name, icon: ShieldCheck },
              { label: "Portal status", value: hasBilling ? "Connected" : "Not connected", icon: CreditCard },
              { label: "Billing posture", value: plan === "free" ? "Upgrade available" : "Active subscription", icon: Sparkles },
            ].map((item) => (
              <div key={item.label} className="geo-premium-muted min-w-[170px] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  <item.icon className="h-3.5 w-3.5 text-electric-500" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium text-red-100">Billing data couldn’t load</p>
              <p className="mt-1 text-red-200/90">{error instanceof Error ? error.message : "Unknown billing error"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="geo-premium-card rounded-3xl border-0 bg-transparent py-0">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="flex items-center gap-3 text-base">
              <CreditCard className="h-5 w-5 text-electric-400" />
              Current Plan
            </CardTitle>
            <CardDescription>Your active Geothority subscription posture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge className={`${planInfo.color} border-0`}>{planInfo.name}</Badge>
                <p className="mt-3 text-sm text-[var(--foreground)]">{planInfo.summary}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan === "free" ? (
                    <span className="flex items-center gap-1.5">
                      Free tier - 3 scans per day, baseline Trust Stack analysis, and tool access.
                      <InfoTooltip
                        content="Includes basic reporting, foundational scan coverage, and access to your core Geothority workspace."
                        side="right"
                      />
                    </span>
                  ) : plan === "pro" || plan === "growth" ? (
                    "Growth-grade monitoring, stronger reporting, and faster local visibility loops."
                  ) : plan === "agency" || plan === "authority" ? (
                    "Multi-location readiness with premium reporting and broader operational coverage."
                  ) : (
                    "Your active plan is ready for ongoing work."
                  )}
                </p>
              </div>
              {plan !== "free" && <CheckCircle2 className="h-6 w-6 text-emerald-400" />}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              {hasBilling ? (
                <Button variant="outline" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
                  {portalMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening…
                    </>
                  ) : (
                    <>
                      Manage Billing
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : null}

              {plan === "free" && (
                <Button onClick={() => router.push("/pricing")} className="bg-electric-500 hover:bg-electric-400">
                  Upgrade Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="geo-premium-card rounded-3xl border-0 bg-transparent py-0">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-base">Included with your current setup</CardTitle>
            <CardDescription>What this billing posture unlocks right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            {[
              plan === "free" ? "Foundational scan coverage and score visibility" : "Ongoing reporting and subscription-backed access",
              plan === "free" ? "Clear upgrade path once you need more territory coverage" : "Billing portal access for invoices and payment method changes",
              hasBilling ? "Stripe customer connection confirmed" : "Billing portal will appear after a paid subscription is attached",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-electric-400" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {plan === "free" && (
        <Card className="geo-premium-card rounded-3xl border-0 bg-transparent py-0">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-base">Unlock more from $97/mo</CardTitle>
            <CardDescription>Premium capabilities most likely to accelerate launch quality</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Unlimited location audits",
                "Competitor monitoring & alerts",
                "Full Trust Stack™ dashboard",
                "Weekly ranking pulse reports",
                "Local page generation",
                "Branded PDF reporting",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-electric-400" />
                  {feature}
                </div>
              ))}
            </div>
            <Button onClick={() => router.push("/pricing")} className="mt-5 w-full bg-electric-500 hover:bg-electric-400">
              See All Plans
            </Button>
          </CardContent>
        </Card>
      )}

      {data?.subscription && plan !== "free" && !hasBilling && (
        <Card className="rounded-3xl border-yellow-500/30 bg-yellow-500/10">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-300" />
            <p className="text-sm text-yellow-100/90">
              No billing portal details were found for this subscription. Contact support if you expected a connected Stripe customer.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
