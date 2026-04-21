import { Resend } from "resend";

/**
 * Shared email alert service for Geothority.
 * Uses Resend for delivery. All alerts are HTML-formatted.
 */

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM_ADDRESS || "Geothority <alerts@geothority.io>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

// ─── Public API ────────────────────────────────────────────────

export async function sendCompetitorAlerts(
  email: string,
  businessName: string,
  alerts: Array<{ title: string; description: string; severity: string }>
) {
  if (!process.env.RESEND_API_KEY || alerts.length === 0) return;

  const severityColors: Record<string, string> = {
    critical: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: white;">⚠️ Competitor Alert</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">${businessName}</p>
      </div>
      <div style="padding: 24px 32px;">
        <p style="font-size: 14px; line-height: 1.6; color: #9ca3af;">
          We detected ${alerts.length} change${alerts.length > 1 ? "s" : ""} in your competitive landscape that may need your attention.
        </p>
        ${alerts
          .map(
            (a) => `
          <div style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid ${severityColors[a.severity] || "#3b82f6"}; background: rgba(255,255,255,0.03); border-radius: 0 8px 8px 0;">
            <div style="font-size: 14px; font-weight: 600; color: #f3f4f6;">${a.title}</div>
            <div style="font-size: 13px; color: #9ca3af; margin-top: 4px;">${a.description}</div>
          </div>
        `
          )
          .join("")}
        <div style="margin-top: 24px; text-align: center;">
          <a href="${APP_URL}/competitors" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View Competitor Dashboard →
          </a>
        </div>
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: #6b7280; text-align: center;">
        You're receiving this because competitor alerts are enabled for your account.
        <a href="${APP_URL}/settings/notifications" style="color: #9ca3af;">Manage notification preferences</a>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Competitor Alert: ${alerts.length} change${alerts.length > 1 ? "s" : ""} detected — ${businessName}`,
      html,
    });
  } catch (err) {
    console.error("[email-alerts] Failed to send competitor alert:", err);
  }
}

export async function sendCitationDriftAlert(
  email: string,
  businessName: string,
  drifts: Array<{ directory: string; field: string; expected: string; found: string; severity: string }>
) {
  if (!process.env.RESEND_API_KEY || drifts.length === 0) return;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: white;">📋 Citation Drift Detected</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">${businessName}</p>
      </div>
      <div style="padding: 24px 32px;">
        <p style="font-size: 14px; line-height: 1.6; color: #9ca3af;">
          Your business information has drifted from your canonical NAP on ${drifts.length} director${drifts.length > 1 ? "ies" : "y"}. Inconsistent listings hurt your local rankings.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <th style="text-align: left; padding: 8px; font-size: 12px; color: #6b7280;">Directory</th>
            <th style="text-align: left; padding: 8px; font-size: 12px; color: #6b7280;">Field</th>
            <th style="text-align: left; padding: 8px; font-size: 12px; color: #6b7280;">Expected</th>
            <th style="text-align: left; padding: 8px; font-size: 12px; color: #6b7280;">Found</th>
          </tr>
          ${drifts
            .map(
              (d) => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
              <td style="padding: 8px; font-size: 13px; color: #d1d5db;">${d.directory}</td>
              <td style="padding: 8px; font-size: 13px; color: #f59e0b;">${d.field}</td>
              <td style="padding: 8px; font-size: 13px; color: #10b981;">${d.expected}</td>
              <td style="padding: 8px; font-size: 13px; color: #ef4444;">${d.found}</td>
            </tr>
          `
            )
            .join("")}
        </table>
        <div style="margin-top: 24px; text-align: center;">
          <a href="${APP_URL}/citations" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Fix Citation Drift →
          </a>
        </div>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Citation Drift: ${drifts.length} inconsistenc${drifts.length > 1 ? "ies" : "y"} found — ${businessName}`,
      html,
    });
  } catch (err) {
    console.error("[email-alerts] Failed to send citation drift alert:", err);
  }
}

export async function sendAIVisibilityChangeAlert(
  email: string,
  businessName: string,
  changes: Array<{ engine: string; previous: string; current: string; delta: number }>
) {
  if (!process.env.RESEND_API_KEY || changes.length === 0) return;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: white;">✨ AI Visibility Changed</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">${businessName}</p>
      </div>
      <div style="padding: 24px 32px;">
        <p style="font-size: 14px; line-height: 1.6; color: #9ca3af;">
          Your AI visibility score has changed across ${changes.length} platform${changes.length > 1 ? "s" : ""}. AI assistants like ChatGPT, Perplexity, and Claude are the new frontier of local search.
        </p>
        ${changes
          .map(
            (c) => `
          <div style="margin: 12px 0; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 14px; font-weight: 600; color: #f3f4f6;">${c.engine}</div>
              <div style="font-size: 13px; color: #9ca3af;">${c.previous} → ${c.current}</div>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: ${c.delta > 0 ? "#10b981" : "#ef4444"};">
              ${c.delta > 0 ? "+" : ""}${c.delta}
            </div>
          </div>
        `
          )
          .join("")}
        <div style="margin-top: 24px; text-align: center;">
          <a href="${APP_URL}/ai-visibility" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View AI Scorecard →
          </a>
        </div>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `AI Visibility: ${changes.some(c => c.delta > 0) ? "gained" : "lost"} ground on ${changes.length} platform${changes.length > 1 ? "s" : ""} — ${businessName}`,
      html,
    });
  } catch (err) {
    console.error("[email-alerts] Failed to send AI visibility alert:", err);
  }
}

export async function sendGBPAlert(
  email: string,
  businessName: string,
  alerts: Array<{ type: string; title: string; description: string }>
) {
  if (!process.env.RESEND_API_KEY || alerts.length === 0) return;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: white;">📍 GBP Alert</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">${businessName}</p>
      </div>
      <div style="padding: 24px 32px;">
        ${alerts
          .map(
            (a) => `
          <div style="margin: 12px 0; padding: 12px 16px; border-left: 3px solid #10b981; background: rgba(255,255,255,0.03); border-radius: 0 8px 8px 0;">
            <div style="font-size: 14px; font-weight: 600; color: #f3f4f6;">${a.title}</div>
            <div style="font-size: 13px; color: #9ca3af; margin-top: 4px;">${a.description}</div>
          </div>
        `
          )
          .join("")}
        <div style="margin-top: 24px; text-align: center;">
          <a href="${APP_URL}/gbp-monitor" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View GBP Dashboard →
          </a>
        </div>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `GBP Alert: ${alerts[0].title} — ${businessName}`,
      html,
    });
  } catch (err) {
    console.error("[email-alerts] Failed to send GBP alert:", err);
  }
}
