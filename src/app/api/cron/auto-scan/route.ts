import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function buildEmailHtml(params: {
  businessName: string;
  url: string;
  oldScore: number;
  newScore: number;
  quickWins: { title: string; description?: string; impact?: string }[];
  scanUrl: string;
}): string {
  const { businessName, url, oldScore, newScore, quickWins, scanUrl } = params;
  const diff = newScore - oldScore;
  const isImproved = diff > 0;
  const isDeclined = diff < 0;

  const scoreColor = isImproved ? "#10b981" : isDeclined ? "#ef4444" : "#6b7280";
  const scoreEmoji = isImproved ? "📈" : isDeclined ? "📉" : "📊";
  const subject = isImproved
    ? `Your Trust Stack score improved! ${oldScore} → ${newScore} (+${diff} points)`
    : isDeclined
    ? `Your Trust Stack score dropped. ${oldScore} → ${newScore} (${diff} points)`
    : `Your weekly Trust Stack check: still at ${newScore}`;

  const headline = isImproved
    ? `Great news! Your score improved ${scoreEmoji}`
    : isDeclined
    ? `Your score needs attention ${scoreEmoji}`
    : `Your weekly SEO check is ready ${scoreEmoji}`;

  const scoreMessage = isImproved
    ? `Your Trust Stack score jumped from <strong>${oldScore}</strong> to <strong style="color:${scoreColor}">${newScore}</strong> — that's +${diff} points!`
    : isDeclined
    ? `Your Trust Stack score dropped from <strong>${oldScore}</strong> to <strong style="color:${scoreColor}">${newScore}</strong> (${diff} points). Here's what changed.`
    : `Your Trust Stack score is holding steady at <strong>${newScore}</strong>. Here are your top opportunities to improve.`;

  const topWins = quickWins.slice(0, 3);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0d13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d13;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#14b8a6);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Geothority</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Weekly Trust Stack Report</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#111827;padding:40px;border-radius:0 0 16px 16px;">
              
              <!-- Headline -->
              <h2 style="margin:0 0 16px;color:#f9fafb;font-size:22px;font-weight:700;">${headline}</h2>
              <p style="margin:0 0 8px;color:#9ca3af;font-size:14px;">
                ${businessName ? `<strong style="color:#d1d5db;">${businessName}</strong> · ` : ""}${url}
              </p>

              <!-- Score Comparison -->
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;width:100%;">
                <tr>
                  <td style="background:#1f2937;border-radius:12px;padding:24px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="text-align:center;padding:0 20px;">
                          <div style="font-size:48px;font-weight:800;color:#6b7280;">${oldScore}</div>
                          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Previous</div>
                        </td>
                        <td style="text-align:center;padding:0 16px;">
                          <div style="font-size:28px;color:${scoreColor};">→</div>
                        </td>
                        <td style="text-align:center;padding:0 20px;">
                          <div style="font-size:48px;font-weight:800;color:${scoreColor};">${newScore}</div>
                          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Current</div>
                        </td>
                      </tr>
                    </table>
                    ${diff !== 0 ? `<div style="margin-top:16px;display:inline-block;background:${scoreColor}22;color:${scoreColor};padding:4px 12px;border-radius:20px;font-size:14px;font-weight:600;">${diff > 0 ? "+" : ""}${diff} points</div>` : ""}
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <p style="margin:0 0 28px;color:#9ca3af;font-size:15px;line-height:1.6;">${scoreMessage}</p>

              <!-- Quick Wins -->
              ${topWins.length > 0 ? `
              <h3 style="margin:0 0 16px;color:#f9fafb;font-size:16px;font-weight:600;">Top Quick Wins</h3>
              ${topWins.map((win) => `
              <table cellpadding="0" cellspacing="0" style="margin:0 0 12px;width:100%;">
                <tr>
                  <td style="background:#1f2937;border-radius:10px;padding:16px;">
                    <div style="color:#d1d5db;font-size:14px;font-weight:600;margin-bottom:4px;">${win.title}</div>
                    ${win.description ? `<div style="color:#9ca3af;font-size:13px;">${win.description}</div>` : ""}
                    ${win.impact ? `<div style="display:inline-block;margin-top:8px;background:#10b98122;color:#10b981;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;text-transform:uppercase;">${win.impact}</div>` : ""}
                  </td>
                </tr>
              </table>
              `).join("")}
              ` : ""}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:32px 0 0;width:100%;">
                <tr>
                  <td align="center">
                    <a href="${scanUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">
                      View Full Report →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#4b5563;font-size:12px;">
                © ${new Date().getFullYear()} Geothority · 
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications" style="color:#6b7280;text-decoration:underline;">Manage notifications</a>
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

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service client so we can query without user auth context
  const supabase = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.com";

  try {
    // Get all users with scans, grouped by most recent scan
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: usersWithScans, error } = await supabase
      .from("scans")
      .select("user_id, url, created_at, geothority_score, quick_wins, id")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Cron: Error fetching scans", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    // Group by user_id — get most recent scan per user
    const userLatestScan = new Map<string, typeof usersWithScans[0]>();
    for (const scan of usersWithScans ?? []) {
      if (!userLatestScan.has(scan.user_id)) {
        userLatestScan.set(scan.user_id, scan);
      }
    }

    let scansTriggered = 0;
    let emailsSent = 0;
    const errors: string[] = [];

    for (const [userId, latestScan] of Array.from(userLatestScan.entries())) {
      try {
        // Skip if scanned within 7 days
        if (latestScan.created_at > sevenDaysAgo) continue;

        // Get user email via service client admin API
        const serviceClient = createServiceClient();
        const { data: userData } = await serviceClient.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email;
        if (!userEmail) continue;

        // Get business name from scan
        const rawData = (latestScan as unknown as Record<string, unknown>).raw_scan_data as Record<string, string> | null;
        const businessName = rawData?.businessName || rawData?.business_name || "";

        // Trigger a new scan
        const scanRes = await fetch(`${appUrl}/api/scan/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: latestScan.url, userId }),
        });

        if (!scanRes.ok) {
          errors.push(`Scan failed for user ${userId}`);
          continue;
        }

        const newScan = await scanRes.json();
        const newScore = newScan.geothority_score ?? newScan.score ?? 0;
        const oldScore = latestScan.geothority_score ?? 0;
        const quickWins = newScan.quick_wins ?? [];

        scansTriggered++;

        // Send email notification
        const scanUrl = `${appUrl}/scan/${newScan.id}`;
        const diff = newScore - oldScore;

        const subject = diff > 0
          ? `Your Trust Stack score improved! ${oldScore} → ${newScore} (+${diff} points)`
          : diff < 0
          ? `Your Trust Stack score dropped. ${oldScore} → ${newScore} (${diff} points)`
          : `Your weekly Trust Stack check: still at ${newScore}`;

        const html = buildEmailHtml({
          businessName,
          url: latestScan.url,
          oldScore,
          newScore,
          quickWins,
          scanUrl,
        });

        await resend.emails.send({
          from: "Geothority <reports@geothority.com>",
          to: userEmail,
          subject,
          html,
        });

        emailsSent++;
      } catch (userErr) {
        errors.push(`Error processing user ${userId}: ${String(userErr)}`);
      }
    }

    return NextResponse.json({
      success: true,
      scansTriggered,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Auto-scan cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
