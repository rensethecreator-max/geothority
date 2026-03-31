"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import {
  CreditCard,
  Link2,
  User,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

function SettingsContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cmsType, setCmsType] = useState<string>("");
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [savingCms, setSavingCms] = useState(false);
  const [cmsSaved, setCmsSaved] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        if (data.cms_type) setCmsType(data.cms_type);
        if (data.cms_credentials) {
          setWpUrl(data.cms_credentials.siteUrl || "");
          setWpUser(data.cms_credentials.username || "");
        }
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveCms = async () => {
    if (!profile) return;
    setSavingCms(true);

    const credentials = cmsType === "wordpress"
      ? { siteUrl: wpUrl, username: wpUser, appPassword: wpPass }
      : {};

    await supabase
      .from("user_profiles")
      .update({
        cms_type: cmsType || null,
        cms_credentials: cmsType ? credentials : null,
      })
      .eq("id", profile.id);

    setCmsSaved(true);
    setSavingCms(false);
    setTimeout(() => setCmsSaved(false), 3000);
  };

  const handleUpgrade = async (plan: string) => {
    setUpgradingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch {
      setUpgradingPlan(null);
    }
  };

  if (loading) return <DashboardSkeleton />;

  const currentPlan = profile?.plan || "free";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {success && (
        <div className="p-4 bg-score-good/10 border border-score-good/20 rounded-xl flex items-center gap-2 text-score-good">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">
            Payment successful! Your plan has been updated.
          </span>
        </div>
      )}

      {/* Profile */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
          <User className="w-4 h-4 text-electric-500" />
          <h2 className="font-semibold">Profile</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--muted-foreground)]">Business</span>
              <div className="font-medium">{profile?.business_name || "Not set"}</div>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Location</span>
              <div className="font-medium">
                {profile?.city && profile?.state
                  ? `${profile.city}, ${profile.state}`
                  : "Not set"}
              </div>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Website</span>
              <div className="font-medium">{profile?.website_url || "Not set"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-electric-500" />
          <h2 className="font-semibold">Billing</h2>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-[var(--muted-foreground)]">Current Plan</span>
              <div className="text-lg font-bold capitalize">
                {currentPlan === "free" ? "Free" : PLANS[currentPlan as PlanKey]?.name || currentPlan}
              </div>
            </div>
            {currentPlan !== "free" && (
              <span className="px-3 py-1 bg-score-good/10 text-score-good text-xs font-medium rounded-full">
                Active
              </span>
            )}
          </div>

          {currentPlan === "free" && (
            <div className="grid md:grid-cols-3 gap-3">
              {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                const plan = PLANS[key];
                return (
                  <button
                    key={key}
                    onClick={() => handleUpgrade(key)}
                    disabled={upgradingPlan === key}
                    className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)] hover:border-electric-500/50 transition-colors text-left"
                  >
                    <div className="font-semibold text-sm">{plan.name}</div>
                    <div className="text-lg font-bold mt-1">${plan.price}/mo</div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-electric-500">
                      {upgradingPlan === key ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                      {upgradingPlan === key ? "Redirecting..." : "Upgrade"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {currentPlan !== "free" && (
            <p className="text-xs text-[var(--muted-foreground)]">
              To change your plan or cancel, please contact{" "}
              <a
                href="mailto:will@4minuteworkday.com"
                className="text-electric-500 hover:underline"
              >
                support
              </a>
              .
            </p>
          )}
        </div>
      </div>

      {/* CMS Integration */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
          <Link2 className="w-4 h-4 text-electric-500" />
          <h2 className="font-semibold">CMS Integration</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">CMS Platform</label>
            <select
              value={cmsType}
              onChange={(e) => setCmsType(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
            >
              <option value="">None (manual publishing)</option>
              <option value="wordpress">WordPress</option>
              <option value="wix">Wix (coming soon)</option>
              <option value="squarespace">Squarespace (coming soon)</option>
            </select>
          </div>

          {cmsType === "wordpress" && (
            <div className="space-y-3 pl-4 border-l-2 border-electric-500/30">
              <div>
                <label className="text-sm font-medium mb-1 block">WordPress Site URL</label>
                <input
                  type="url"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Username</label>
                <input
                  type="text"
                  value={wpUser}
                  onChange={(e) => setWpUser(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Application Password</label>
                <input
                  type="password"
                  value={wpPass}
                  onChange={(e) => setWpPass(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  WordPress → Users → Application Passwords. This is NOT your login password.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveCms}
            disabled={savingCms}
            className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {cmsSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : savingCms ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save CMS Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}
