/**
 * email-journey-service.ts
 * Geothority-specific email journey engine using Supabase.
 * Adapted from the standard SaaS package template.
 */

import { createServiceClient } from "@/lib/supabase/server";

// ---- Types ----------------------------------------------------------------

export type JourneyStepType = "immediate" | "delay" | "trigger";

export interface JourneyStepConfig {
  stepOrder: number;
  name: string;
  subject: string;
  templateId: string;
  type: JourneyStepType;
  delayDays?: number;
  triggerEvent?: string;
  bodyHtml?: string;
}

export interface JourneyConfig {
  journeyId: string;
  name: string;
  steps: JourneyStepConfig[];
}

// ---- Geothority Email Journey Configs ------------------------------------

const JOURNEY_CONFIGS: Record<string, JourneyConfig> = {
  onboarding: {
    journeyId: "onboarding",
    name: "Geothority Onboarding Journey",
    steps: [
      {
        stepOrder: 1,
        name: "Welcome Email",
        subject: "Your local SEO command center is live 🗺️",
        templateId: "welcome",
        type: "immediate",
        bodyHtml: `<p>Welcome to Geothority — the local SEO platform built for insurance agents and local businesses.</p>
<p>Your account is ready. Here's what to do first:</p>
<ul>
  <li>Run your first local SEO audit to see your Trust Stack™ score</li>
  <li>Connect your Google Business Profile</li>
  <li>Check your top competitors' rankings</li>
</ul>
<p>Your local SEO command center is waiting. Let's get you found.</p>`,
      },
      {
        stepOrder: 2,
        name: "Run First Audit (Day 1)",
        subject: "Run your first Local SEO audit →",
        templateId: "feature_tip",
        type: "delay",
        delayDays: 1,
        bodyHtml: `<p>Have you run your first scan yet? It takes 90 seconds and shows you exactly why you're invisible in local search — and what to do about it.</p>
<p>Your Trust Stack™ score measures 5 layers of local authority:</p>
<ul>
  <li>Foundation: NAP consistency & Google Business Profile</li>
  <li>Trust Pages: About, FAQ, Service Areas</li>
  <li>Geo Content: City-specific landing pages</li>
  <li>Reviews: Velocity, recency & response rate</li>
  <li>AI Optimization: Schema, entity density & GEO signals</li>
</ul>`,
      },
      {
        stepOrder: 3,
        name: "Trust Stack Explained (Day 3)",
        subject: "Your trust stack score explained",
        templateId: "check_in",
        type: "delay",
        delayDays: 3,
        bodyHtml: `<p>Your Trust Stack™ is the foundation of your local authority. The higher your score, the more Google trusts you as the default local answer for insurance in your area.</p>
<p>Most agents score between 30–50. Top performers score 80+. The gap is almost always fixable in under 30 days with the right moves.</p>
<p>Log in and check your score — then tap into your Quick Win cards to start moving the needle.</p>`,
      },
      {
        stepOrder: 4,
        name: "Quick Wins (Day 7)",
        subject: "3 quick wins to boost your local rankings this week",
        templateId: "feature_tip",
        type: "delay",
        delayDays: 7,
        bodyHtml: `<p>Here are 3 moves that will have the biggest impact on your local SEO rankings this week:</p>
<ol>
  <li><strong>Complete your Google Business Profile</strong> — Add photos, hours, and a keyword-rich description.</li>
  <li><strong>Get 2 new reviews</strong> — Ask your last 2 satisfied clients. Each review boosts your Trust Stack™ score.</li>
  <li><strong>Add a city-specific landing page</strong> — "Insurance Agent in [City]" pages are a top ranking signal for local search.</li>
</ol>
<p>Your Quick Win cards in Geothority have the exact copy you need for each of these. Just copy and paste.</p>`,
      },
      {
        stepOrder: 5,
        name: "Upgrade Nudge (Day 14)",
        subject: "Upgrade to unlock competitor monitoring",
        templateId: "upgrade_nudge",
        type: "delay",
        delayDays: 14,
        bodyHtml: `<p>You've been auditing your local SEO presence — great start. But here's the thing: your competitors are optimizing right now.</p>
<p>Upgrade to Pro to unlock:</p>
<ul>
  <li>Competitor Watchdog — alerts when competitors gain rankings</li>
  <li>Unlimited audits — scan any URL, anytime</li>
  <li>Full Trust Stack™ dashboard with weekly score tracking</li>
  <li>local page engine for city/service landing pages</li>
</ul>
<p>At $49/mo, it's less than one referral fee. And the visibility you gain is permanent.</p>`,
      },
      {
        stepOrder: 6,
        name: "Monthly Report (Day 30)",
        subject: "Your monthly local SEO health report",
        templateId: "check_in",
        type: "delay",
        delayDays: 30,
        bodyHtml: `<p>30 days in! Here's a reminder to check your monthly local SEO health report in Geothority.</p>
<p>Your report shows:</p>
<ul>
  <li>Trust Stack™ score changes since you started</li>
  <li>New reviews and average rating trends</li>
  <li>Competitor ranking shifts in your area</li>
  <li>Recommended next actions for the month ahead</li>
</ul>
<p>Consistency is the secret to local SEO dominance. Log in and keep the momentum going.</p>`,
      },
    ],
  },

  win_back: {
    journeyId: "win_back",
    name: "Win-Back Journey",
    steps: [
      {
        stepOrder: 1,
        name: "Win-Back Email",
        subject: "Your competitors didn't stop optimizing",
        templateId: "win_back",
        type: "immediate",
        bodyHtml: `<p>While you've been away, your competitors have been posting to Google Business, collecting reviews, and building local authority.</p>
<p>Local SEO is a slow game — but consistency wins it. The agents who show up every week end up owning the top 3 local results for their area.</p>
<p>Log back in and run a new scan. See where you stand today versus 14 days ago.</p>`,
      },
      {
        stepOrder: 2,
        name: "Win-Back Follow Up (Day 7)",
        subject: "One audit. 90 seconds. See exactly what to fix.",
        templateId: "check_in",
        type: "delay",
        delayDays: 7,
        bodyHtml: `<p>Still haven't run a scan? No worries. It takes less than 2 minutes and you'll walk away with a clear priority list.</p>
<p>Your Trust Stack™ score tells you exactly which layer needs the most work — and your Quick Win cards give you the copy to fix it today.</p>
<p>Come back. Your local SEO is waiting.</p>`,
      },
    ],
  },
};

// ---- Email sender ----------------------------------------------------------

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[emailJourney] RESEND_API_KEY not set — email not sent");
    return;
  }

  const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "noreply@geothority.io";
  const fromName = "Geothority";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Resend API error ${resp.status}: ${body}`);
  }
}

// ---- Email HTML builder ---------------------------------------------------

function buildEmailHtml(vars: {
  subject: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaText?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geothority.io";
  const ctaUrl = vars.ctaUrl ?? `${appUrl}/dashboard`;
  const ctaText = vars.ctaText ?? "Open Geothority";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Geothority</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f0f12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  </style>
</head>
<body style="background-color:#0f0f12; margin:0; padding:0;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0f0f12;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560"
          style="background-color:#18181b; border-radius:12px; border:1px solid #27272a;">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#6366f1); padding:24px 40px;">
              <p style="margin:0; font-size:22px; font-weight:700; color:#fff; letter-spacing:-0.3px;">Geothority</p>
              <p style="margin:4px 0 0; font-size:13px; color:rgba(255,255,255,0.7);">Local SEO for Insurance Agents</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              ${vars.bodyHtml}
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto 0;">
                <tr>
                  <td style="border-radius:8px; background:linear-gradient(135deg,#3b82f6,#6366f1);">
                    <a href="${ctaUrl}" target="_blank"
                      style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600;
                        color:#fff; text-decoration:none; border-radius:8px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px; border-top:1px solid #27272a;">
              <p style="margin:0; font-size:12px; color:#71717a; text-align:center; line-height:1.6;">
                © ${new Date().getFullYear()} Geothority. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---- Public API -----------------------------------------------------------

export async function initializeJourney(userId: string, journeyId: string): Promise<void> {
  const config = JOURNEY_CONFIGS[journeyId];
  if (!config) return;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("user_email_journey_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("journey_id", journeyId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const firstStep = config.steps.find((s) => s.stepOrder === 1);
  let nextSendAt: string | null = null;
  if (firstStep?.type === "immediate") {
    nextSendAt = new Date().toISOString();
  } else if (firstStep?.type === "delay" && firstStep.delayDays != null) {
    const d = new Date();
    d.setDate(d.getDate() + firstStep.delayDays);
    nextSendAt = d.toISOString();
  }

  await supabase.from("user_email_journey_progress").insert({
    user_id: userId,
    journey_id: journeyId,
    current_step_order: 1,
    status: "active",
    next_send_at: nextSendAt,
  });
}

export async function processAllPendingJourneys(): Promise<void> {
  const supabase = createServiceClient();

  const { data: pendingRows } = await supabase
    .from("user_email_journey_progress")
    .select("*")
    .eq("status", "active")
    .not("next_send_at", "is", null)
    .lte("next_send_at", new Date().toISOString())
    .order("next_send_at", { ascending: true })
    .limit(500);

  if (!pendingRows?.length) return;

  console.log(`[emailJourney] Processing ${pendingRows.length} pending steps`);

  for (const row of pendingRows) {
    try {
      await processSingleProgressRow(row);
    } catch (err) {
      console.error(`[emailJourney] Error processing row id=${row.id}:`, err);
    }
  }
}

export async function triggerJourneyEvent(userId: string, eventName: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: progressRows } = await supabase
    .from("user_email_journey_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  for (const row of progressRows ?? []) {
    const config = JOURNEY_CONFIGS[row.journey_id];
    if (!config) continue;

    const currentStep = config.steps.find((s) => s.stepOrder === row.current_step_order);
    if (currentStep?.type === "trigger" && currentStep.triggerEvent === eventName) {
      await supabase
        .from("user_email_journey_progress")
        .update({ next_send_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  }
}

export function getJourneyConfig(journeyId: string): JourneyConfig | undefined {
  return JOURNEY_CONFIGS[journeyId];
}

export function getAllJourneyIds(): string[] {
  return Object.keys(JOURNEY_CONFIGS);
}

// ---- Internal helper -------------------------------------------------------

async function processSingleProgressRow(row: any): Promise<void> {
  const config = JOURNEY_CONFIGS[row.journey_id];
  if (!config) return;

  const step = config.steps.find((s) => s.stepOrder === row.current_step_order);
  if (!step) {
    const supabase = createServiceClient();
    await supabase
      .from("user_email_journey_progress")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return;
  }

  // Load user
  const supabase = createServiceClient();
  const { data: userData } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", row.user_id)
    .single();

  const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
  const email = authUser?.user?.email;
  const name = authUser?.user?.user_metadata?.full_name ?? email?.split("@")[0] ?? "there";

  if (!email) {
    await supabase
      .from("user_email_journey_progress")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geothority.io";
  const bodyHtml = step.bodyHtml ?? `<p>Hi ${name},</p><p>A new update from Geothority is ready for you.</p>`;
  const html = buildEmailHtml({
    subject: step.subject,
    bodyHtml: bodyHtml.replace(/\{\{userName\}\}/g, name),
    ctaUrl: `${appUrl}/dashboard`,
    ctaText: "Open Geothority",
  });

  try {
    await sendEmail({ to: email, subject: step.subject, html });
  } catch (err) {
    console.error(`[emailJourney] Send error (userId=${row.user_id}, step=${step.name}):`, err);
    return; // Don't advance — will retry
  }

  // Advance to next step
  const nextStep = config.steps.find((s) => s.stepOrder === step.stepOrder + 1);
  if (!nextStep) {
    await supabase
      .from("user_email_journey_progress")
      .update({
        status: "completed",
        last_sent_at: new Date().toISOString(),
        next_send_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return;
  }

  let nextSendAt: string | null = null;
  if (nextStep.type === "immediate") {
    nextSendAt = new Date().toISOString();
  } else if (nextStep.type === "delay" && nextStep.delayDays != null) {
    const d = new Date();
    d.setDate(d.getDate() + nextStep.delayDays);
    nextSendAt = d.toISOString();
  }

  await supabase
    .from("user_email_journey_progress")
    .update({
      current_step_order: nextStep.stepOrder,
      last_sent_at: new Date().toISOString(),
      next_send_at: nextSendAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
}
