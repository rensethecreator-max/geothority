"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { ApiKeyGrid } from "@/components/settings/api-key-grid";
import {
  CreditCard,
  Link2,
  User,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
  Trash2,
  AlertTriangle,
  Save,
  Shield,
  Key,
} from "lucide-react";
import {
  type AutomationActionKey,
  type AutomationPolicyMode,
  AUTOMATION_ACTIONS,
  DEFAULT_AUTOMATION_POLICIES,
  POLICY_MODE_LABELS,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const success = searchParams.get("success");

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ business_name: "", city: "", state: "", website_url: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // CMS state
  const [cmsType, setCmsType] = useState<string>("");
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [wpContentType, setWpContentType] = useState<"pages" | "posts">("pages");
  const [autoPublishFixes, setAutoPublishFixes] = useState(false);
  const [verifyAfterPublish, setVerifyAfterPublish] = useState(true);
  const [savingCms, setSavingCms] = useState(false);
  const [cmsSaved, setCmsSaved] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  // Automation policy state
  const [policies, setPolicies] = useState<Record<AutomationActionKey, AutomationPolicyMode>>({ ...DEFAULT_AUTOMATION_POLICIES });
  const [savingPolicies, setSavingPolicies] = useState(false);
  const [policiesSaved, setPoliciesSaved] = useState(false);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");

      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setProfileForm({
          business_name: data.business_name || "",
          city: data.city || "",
          state: data.state || "",
          website_url: data.website_url || "",
        });
        if (data.cms_type) setCmsType(data.cms_type);
        if (data.cms_credentials) {
          setWpUrl(data.cms_credentials.siteUrl || "");
          setWpUser(data.cms_credentials.username || "");
          setWpContentType(data.cms_credentials.wordpressContentType === "posts" ? "posts" : "pages");
          setAutoPublishFixes(Boolean(data.cms_credentials.autoPublishFixes));
          setVerifyAfterPublish(data.cms_credentials.verifyAfterPublish !== false);
        }
        if (data.automation_policies) {
          setPolicies({ ...DEFAULT_AUTOMATION_POLICIES, ...(data.automation_policies as Partial<Record<AutomationActionKey, AutomationPolicyMode>>) });
        }
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setProfileError(null);

    const { error } = await supabase
      .from("user_profiles")
      .update({
        business_name: profileForm.business_name || null,
        city: profileForm.city || null,
        state: profileForm.state || null,
        website_url: profileForm.website_url || null,
      })
      .eq("id", profile.id);

    setSavingProfile(false);
    if (error) {
      setProfileError(error.message);
    } else {
      setProfile({ ...profile, ...profileForm });
      setProfileSaved(true);
      setEditingProfile(false);
      trackEvent("settings_profile_saved");
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: deleteConfirmEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Deletion failed.");
        setDeleting(false);
      } else {
        // Account deleted - redirect to marketing site
        router.push("/");
      }
    } catch {
      setDeleteError("Network error. Please try again.");
      setDeleting(false);
    }
  };

  const handleSavePolicies = async () => {
    if (!profile) return;
    setSavingPolicies(true);
    await supabase
      .from("user_profiles")
      .update({ automation_policies: policies })
      .eq("id", profile.id);
    setSavingPolicies(false);
    setPoliciesSaved(true);
    setTimeout(() => setPoliciesSaved(false), 3000);
  };

  const handleSaveCms = async () => {
    if (!profile) return;
    setSavingCms(true);

    const credentials = cmsType === "wordpress"
      ? {
          siteUrl: wpUrl,
          username: wpUser,
          appPassword: wpPass,
          wordpressContentType: wpContentType,
          autoPublishFixes,
          verifyAfterPublish,
        }
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

  const [billingAnnual, setBillingAnnual] = useState(false);

  const handleUpgrade = async (plan: string) => {
    setUpgradingPlan(plan);
    trackEvent("upgrade_clicked", { plan, currentPlan: profile?.plan || "free", annual: billingAnnual });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, annual: billingAnnual }),
      });

      if (res.ok) {
        const { url } = await res.json();
        trackEvent("checkout_started", { plan });
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
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Settings sub-navigation */}
      <div className="flex gap-1 border-b border-[var(--border)] pb-0 -mb-2">
        {[
          { label: "General", href: "/settings" },
          { label: "Notifications", href: "/settings/notifications" },
          { label: "Embed", href: "/settings/embed" },
        ].map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              typeof window !== "undefined" && window.location.pathname === tab.href
                ? "border-electric-500 text-electric-400"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

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
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-electric-500" />
            <h2 className="font-semibold">Profile</h2>
          </div>
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="text-xs text-electric-500 hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        <div className="p-4 space-y-4">
          {profileError && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {profileError}
            </div>
          )}
          {profileSaved && (
            <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Profile saved!
            </div>
          )}

          {editingProfile ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Business Name</label>
                  <input
                    type="text"
                    value={profileForm.business_name}
                    onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                    placeholder="Your Agency Name"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    placeholder="Tampa"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">State</label>
                  <input
                    type="text"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    placeholder="FL"
                    maxLength={2}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Website URL</label>
                  <input
                    type="url"
                    value={profileForm.website_url}
                    onChange={(e) => setProfileForm({ ...profileForm, website_url: e.target.value })}
                    placeholder="https://youragency.com"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {savingProfile ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Profile</>
                  )}
                </button>
                <button
                  onClick={() => { setEditingProfile(false); setProfileError(null); }}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--accent)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--muted-foreground)]">Business</span>
                <div className="font-medium">{profile?.business_name || <span className="text-[var(--muted-foreground)] italic">Not set</span>}</div>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Location</span>
                <div className="font-medium">
                  {profile?.city && profile?.state
                    ? `${profile.city}, ${profile.state}`
                    : <span className="text-[var(--muted-foreground)] italic">Not set</span>}
                </div>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Website</span>
                <div className="font-medium">{profile?.website_url || <span className="text-[var(--muted-foreground)] italic">Not set</span>}</div>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Email</span>
                <div className="font-medium">{userEmail || <span className="text-[var(--muted-foreground)] italic">-</span>}</div>
              </div>
            </div>
          )}
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
            <>
              {/* Annual toggle */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-sm font-medium ${!billingAnnual ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>Monthly</span>
                <button
                  onClick={() => setBillingAnnual(!billingAnnual)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${billingAnnual ? "bg-emerald-500" : "bg-[var(--muted)]"}`}
                >
                  <span className={`absolute top-0.5 ${billingAnnual ? "left-5" : "left-0.5"} w-4 h-4 bg-white rounded-full transition-all shadow-sm`} />
                </button>
                <span className={`text-sm font-medium ${billingAnnual ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                  Annual
                  <span className="ml-1 text-xs text-emerald-500 font-semibold">Save ~17%</span>
                </span>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                  const plan = PLANS[key];
                  const displayPrice = billingAnnual && plan.annualPrice
                    ? `$${Math.round(plan.annualPrice / 12)}/mo`
                    : `$${plan.price}/mo`;
                  const annualNote = billingAnnual
                    ? `$${plan.annualPrice}/yr billed annually`
                    : null;
                  return (
                    <button
                      key={key}
                      onClick={() => handleUpgrade(key)}
                      disabled={upgradingPlan === key}
                      className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)] hover:border-electric-500/50 transition-colors text-left"
                    >
                      <div className="font-semibold text-sm">{plan.name}</div>
                      <div className="text-lg font-bold mt-1">{displayPrice}</div>
                      {annualNote && (
                        <div className="text-xs text-emerald-500 mt-0.5">{annualNote}</div>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs text-electric-500">
                        {upgradingPlan === key ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {upgradingPlan === key ? "Redirecting..." : "Start 14-Day Trial"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {currentPlan !== "free" && (
            <p className="text-xs text-[var(--muted-foreground)]">
              To change your plan or cancel, please contact{" "}
              <a
                href="mailto:hello@geothority.io"
                className="text-electric-500 hover:underline"
              >
                support
              </a>
              .
            </p>
          )}
        </div>
      </div>

      {/* API Key Configuration */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
          <Key className="w-4 h-4 text-electric-500" />
          <h2 className="font-semibold">API Configuration</h2>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            Geothority integrates with several services. Keys marked <span className="text-red-400 font-medium">Required</span> are needed for core features. Others enhance specific capabilities.
          </p>
          <ApiKeyGrid />
          <p className="text-xs text-[var(--muted-foreground)] pt-1">
            API keys are configured via environment variables. See <code className="px-1 py-0.5 bg-[var(--muted)] rounded text-[11px]">.env.example</code> for the full list.
          </p>
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
              <div>
                <label className="text-sm font-medium mb-1 block">Default publish target</label>
                <select
                  value={wpContentType}
                  onChange={(e) => setWpContentType(e.target.value as "pages" | "posts")}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                >
                  <option value="pages">Pages</option>
                  <option value="posts">Posts</option>
                </select>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3">
                <input
                  type="checkbox"
                  checked={autoPublishFixes}
                  onChange={(e) => setAutoPublishFixes(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium">Auto-publish completed fix outputs</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">
                    When Geothority creates a draft from a completed fix step, try to push it straight to WordPress using these saved settings.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3">
                <input
                  type="checkbox"
                  checked={verifyAfterPublish}
                  onChange={(e) => setVerifyAfterPublish(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium">Verify after publish</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">
                    After publishing, re-check WordPress and confirm the page or post exists before reporting success.
                  </div>
                </div>
              </label>
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

      {/* Automation Policies */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
          <Shield className="w-4 h-4 text-electric-500" />
          <h2 className="font-semibold">Automation Policies</h2>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            Control how Geothority handles each action type. &quot;Auto-apply&quot; executes immediately, &quot;Approval required&quot; waits for your go-ahead, and &quot;Manual only&quot; disables automation entirely.
          </p>
          {AUTOMATION_ACTIONS.map(({ key, label, description }) => (
            <div key={key} className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border)] p-3">
              <div className="flex-1">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{description}</div>
              </div>
              <select
                value={policies[key]}
                onChange={(e) => setPolicies({ ...policies, [key]: e.target.value as AutomationPolicyMode })}
                className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
              >
                {(Object.keys(POLICY_MODE_LABELS) as AutomationPolicyMode[]).map((mode) => (
                  <option key={mode} value={mode}>{POLICY_MODE_LABELS[mode]}</option>
                ))}
              </select>
            </div>
          ))}
          <button
            onClick={handleSavePolicies}
            disabled={savingPolicies}
            className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {policiesSaved ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : savingPolicies ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              "Save Policies"
            )}
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="bg-[var(--card)] rounded-xl border border-red-500/30">
        <div className="p-4 border-b border-red-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h2 className="font-semibold text-red-400">Danger Zone</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Permanently delete your Geothority account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Delete Account</h3>
                <p className="text-sm text-[var(--muted-foreground)]">This action is permanent and irreversible.</p>
              </div>
            </div>

            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              All your scans, reports, content, and billing data will be permanently deleted.
              Type your email address to confirm:
            </p>

            {deleteError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {deleteError}
              </div>
            )}

            <input
              type="email"
              placeholder={userEmail}
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmEmail.toLowerCase() !== userEmail.toLowerCase()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete My Account</>
                )}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmEmail(""); setDeleteError(null); }}
                className="px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--accent)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
