"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CreditCard, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
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

const PLAN_LABELS: Record<string, { name: string; color: string }> = {
  free: { name: "Free", color: "bg-muted text-muted-foreground" },
  audit: { name: "Audit Only", color: "bg-amber-500/20 text-amber-400" },
  starter: { name: "Starter", color: "bg-electric-500/20 text-electric-400" },
  pro: { name: "Pro", color: "bg-purple-500/20 text-purple-400" },
  growth: { name: "Growth", color: "bg-electric-500/20 text-electric-400" },
  authority: { name: "Authority", color: "bg-indigo-500/20 text-indigo-400" },
  agency: { name: "Agency", color: "bg-emerald-500/20 text-emerald-400" },
};

export default function BillingPortalPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/subscription"],
    queryFn: async () => {
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) return { status: "none", subscription: null };
      return res.json();
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/create-portal-session", {
        returnPath: "/billing",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "Failed to open billing portal");
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const plan = data?.subscription?.plan ?? "free";
  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const hasBilling = !!data?.subscription?.stripeCustomerId;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your Geothority plan and payment details.</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-electric-400" />
            Current Plan
          </CardTitle>
          <CardDescription>Your active Geothority subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge className={`${planInfo.color} border-0`}>{planInfo.name}</Badge>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                {plan === "free" ? (
                  <span className="flex items-center gap-1.5">
                    Free tier - 1 location audit, basic score
                    <InfoTooltip
                      content="Includes 3 scans per day, basic Trust Stack analysis, and access to all tools."
                      side="right"
                    />
                  </span>
                ) : plan === "pro" || plan === "growth"
                  ? "Pro - Unlimited audits, competitor monitoring, trust stack tracking"
                  : plan === "agency" || plan === "authority"
                  ? "Agency - Multi-location, white-label reports, client dashboard"
                  : "Your active plan"}
              </p>
            </div>
            {plan !== "free" && (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            {hasBilling ? (
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? "Opening..." : "Manage Billing"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : null}

            {plan === "free" && (
              <Button
                onClick={() => router.push("/pricing")}
                className="bg-electric-500 hover:bg-electric-400"
              >
                Upgrade Plan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature comparison for free users */}
      {plan === "free" && (
        <Card className="border-electric-500/30">
          <CardHeader>
            <CardTitle className="text-base">Unlock More - Plans from $97/mo</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[
                "Unlimited location audits",
                "Competitor monitoring & alerts",
                "Full Trust Stack™ dashboard",
                "Weekly ranking pulse reports",
                "AI content generation",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-electric-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => router.push("/pricing")}
              className="w-full mt-4 bg-electric-500 hover:bg-electric-400"
            >
              See All Plans
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Warning for past due */}
      {data?.subscription && plan !== "free" && !hasBilling && (
        <Card className="border-yellow-500/30">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              No billing details found. Contact support if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
