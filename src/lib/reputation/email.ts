import type { ReputationDeliveryResult, ReputationOutboundMessage, ReputationTransport } from "@/lib/reputation/transport";

function getEmailFromAddress() {
  const configured = process.env.REPUTATION_EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS;
  return configured?.trim() || "Geothority <reviews@geothority.io>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFallbackHtml(message: ReputationOutboundMessage) {
  const reviewLink = message.reviewLink || "";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://geothority.io").replace(/\/$/, "");
  const optOutLink = `${appUrl}/reputation/opt-out/${message.reviewToken}`;
  const body = escapeHtml(message.body).replace(/\n/g, "<br />");
  const accent = "#16c784";

  return `
    <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#ffffff;color:#172033;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden">
      <div style="padding:28px 32px;border-bottom:1px solid #edf0f4">
        <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;font-weight:700">Quick feedback</div>
        <h1 style="font-size:24px;line-height:1.2;margin:10px 0 0;color:#111827">How was your experience with ${escapeHtml(message.businessName)}?</h1>
      </div>
      <div style="padding:28px 32px">
        <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 22px">${body}</p>
        ${reviewLink ? `<a href="${escapeHtml(reviewLink)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700;font-size:14px">Leave quick feedback</a>` : ""}
        <p style="font-size:12px;line-height:1.6;color:#64748b;margin:24px 0 0">This private page helps the business understand your experience before any public review decision.</p>
        <p style="font-size:11px;line-height:1.6;color:#94a3b8;margin:18px 0 0">No longer want these email feedback requests? <a href="${escapeHtml(optOutLink)}" style="color:#64748b">Opt out here</a>.</p>
      </div>
    </div>
  `;
}

export class EmailReputationTransport implements ReputationTransport {
  readonly name = "resend" as const;
  readonly simulated = false;

  async deliver(message: ReputationOutboundMessage): Promise<ReputationDeliveryResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required for email reputation sends");
    }
    if (!message.email) {
      throw new Error("Email address is required for email reputation sends");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFromAddress(),
        to: [message.email],
        subject: message.subject || `Quick question about ${message.businessName}`,
        html: message.html || buildFallbackHtml(message),
        text: message.body,
      }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.message || `Resend send failed (${response.status})`);
    }

    return {
      provider: this.name,
      providerSid: json?.id || null,
      deliveryState: "sent",
      simulated: false,
      metadata: {
        to: message.email,
        from: getEmailFromAddress(),
      },
    };
  }
}
