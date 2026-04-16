"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { Scan } from "@/lib/types";
import { LAYER_NAMES, LAYER_DESCRIPTIONS } from "@/lib/types";

interface PDFReportProps {
  scan: Scan;
}

export function PDFReportButton({ scan }: PDFReportProps) {
  const [generating, setGenerating] = useState(false);

  const handleExport = () => {
    setGenerating(true);

    const ls = scan.layer_scores ?? { layer1: 0, layer2: 0, layer3: 0, layer4: 0, layer5: 0 };
    const quickWins = scan.quick_wins ?? [];
    const competitors = scan.competitor_gaps ?? [];
    const score = scan.geothority_score ?? 0;
    const scoreColor = score >= 70 ? "#059669" : score >= 40 ? "#D97706" : "#DC2626";
    const scanDate = new Date(scan.created_at).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    const gradeLabel =
      score >= 80 ? "Strong" :
      score >= 60 ? "Adequate" :
      score >= 40 ? "Developing" : "Critical";

    const layerRows = ([1, 2, 3, 4, 5] as const).map((n) => {
      const key = `layer${n}` as keyof typeof ls;
      const s = ls[key];
      const c = s >= 70 ? "#059669" : s >= 40 ? "#D97706" : "#DC2626";
      const label = s >= 70 ? "Healthy" : s >= 40 ? "Needs work" : "Critical";
      return `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:12px;font-weight:600;color:#111;">Layer ${n} — ${LAYER_NAMES[n]}</span>
          <div style="font-size:11px;color:#6B7280;margin-top:1px;">${LAYER_DESCRIPTIONS[n]}</div>
        </td>
        <td style="padding:9px 0 9px 20px;border-bottom:1px solid #F3F4F6;width:180px;vertical-align:middle;">
          <div style="background:#F3F4F6;border-radius:3px;height:5px;overflow:hidden;">
            <div style="background:${c};width:${s}%;height:5px;border-radius:3px;"></div>
          </div>
        </td>
        <td style="padding:9px 0 9px 14px;border-bottom:1px solid #F3F4F6;width:90px;vertical-align:middle;text-align:right;">
          <span style="font-size:12px;font-weight:700;color:${c};">${s}/100</span>
          <span style="display:block;font-size:10px;color:#9CA3AF;">${label}</span>
        </td>
      </tr>`;
    }).join("");

    const winRows = quickWins.slice(0, 5).map((w, i) => {
      const impactColor = w.impact === "high" ? "#DC2626" : w.impact === "medium" ? "#D97706" : "#059669";
      const impactLabel = w.impact === "high" ? "High Impact" : w.impact === "medium" ? "Medium" : "Quick Fix";
      const timeEst = w.impact === "high" ? "~2 hr" : w.impact === "medium" ? "~30 min" : "~5 min";
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;width:24px;vertical-align:top;">
          <span style="font-size:11px;color:#9CA3AF;font-weight:500;">${i + 1}.</span>
        </td>
        <td style="padding:10px 0 10px 10px;border-bottom:1px solid #F3F4F6;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
            <span style="font-size:10px;font-weight:600;color:${impactColor};background:${impactColor}12;padding:1px 7px;border-radius:20px;">${impactLabel}</span>
            <span style="font-size:10px;color:#9CA3AF;">${timeEst} · Layer ${w.layer}</span>
          </div>
          <div style="font-size:12px;font-weight:600;color:#111;margin-bottom:2px;">${w.title}</div>
          <div style="font-size:11px;color:#6B7280;line-height:1.5;">${w.description}</div>
        </td>
      </tr>`;
    }).join("");

    const compRows = competitors.slice(0, 3).map((c) => {
      const c2 = c.score >= 70 ? "#059669" : c.score >= 40 ? "#D97706" : "#DC2626";
      const vsLabel = c.score > score ? "↑ Ahead" : "↓ Behind";
      const vsColor = c.score > score ? "#DC2626" : "#059669";
      return `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #F3F4F6;">
          <div style="font-size:12px;font-weight:600;color:#111;">${c.businessName}</div>
          <div style="font-size:11px;color:#6B7280;">${c.domain}</div>
        </td>
        <td style="padding:9px 0 9px 16px;border-bottom:1px solid #F3F4F6;text-align:right;">
          <span style="font-size:13px;font-weight:700;color:${c2};">${c.score}</span>
          <span style="font-size:10px;color:#9CA3AF;">/100</span>
        </td>
        <td style="padding:9px 0 9px 12px;border-bottom:1px solid #F3F4F6;text-align:right;">
          <span style="font-size:11px;font-weight:600;color:${vsColor};">${vsLabel}</span>
        </td>
        <td style="padding:9px 0 9px 16px;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:11px;color:#6B7280;">${c.advantage}</span>
        </td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Local SEO Report — ${scan.business_name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; line-height: 1.5; }
    .page { max-width: 740px; margin: 0 auto; padding: 48px 40px; }
    @media print { .page { padding: 28px 32px; } }

    /* Header */
    .hdr { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; border-bottom: 1.5px solid #111; margin-bottom: 36px; }
    .logo { font-size: 18px; font-weight: 800; letter-spacing: -0.3px; color: #111; }
    .logo em { color: ${scoreColor}; font-style: normal; }
    .hdr-meta { text-align: right; }
    .hdr-meta .biz { font-size: 13px; font-weight: 700; color: #111; }
    .hdr-meta .sub { font-size: 11px; color: #6B7280; margin-top: 2px; }

    /* Score hero */
    .score-hero { display: flex; gap: 36px; align-items: center; margin-bottom: 40px; padding: 28px 28px; background: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 10px; }
    .score-num { font-size: 64px; font-weight: 900; color: ${scoreColor}; line-height: 1; letter-spacing: -2px; }
    .score-denom { font-size: 20px; font-weight: 400; color: #9CA3AF; }
    .score-meta .grade { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${scoreColor}; margin-bottom: 6px; }
    .score-meta .summary { font-size: 13px; color: #374151; line-height: 1.6; max-width: 360px; }

    /* Sections */
    .section { margin-bottom: 36px; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9CA3AF; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }

    /* Footer */
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; }
    .footer .left { font-size: 10px; color: #9CA3AF; }
    .footer .right { font-size: 10px; color: #9CA3AF; }
    .footer strong { color: ${scoreColor}; }
  </style>
</head>
<body>
<div class="page">

  <div class="hdr">
    <div class="logo"><em>Geo</em>thority</div>
    <div class="hdr-meta">
      <div class="biz">${scan.business_name}</div>
      <div class="sub">${scan.city}, ${scan.state} · ${scan.url}</div>
      <div class="sub">Report date: ${scanDate}</div>
    </div>
  </div>

  <div class="score-hero">
    <div>
      <span class="score-num">${score}</span><span class="score-denom">/100</span>
    </div>
    <div class="score-meta">
      <div class="grade">Overall: ${gradeLabel}</div>
      <div class="summary">${
        score >= 70
          ? "Solid local SEO foundation. Focus on the remaining gaps to extend your lead in local search."
          : score >= 40
          ? "Core presence established. Significant gaps remain that limit visibility in local and AI-powered search."
          : "Critical trust signals are missing. High probability of near-zero local search visibility. Prioritize Layer 1 and 2 immediately."
      }</div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Trust Stack Layer Scores</div>
    <table>
      <tbody>${layerRows}</tbody>
    </table>
  </div>

  ${quickWins.length > 0 ? `
  <div class="section">
    <div class="section-label">Prioritized Quick Wins</div>
    <table>
      <tbody>${winRows}</tbody>
    </table>
  </div>
  ` : ""}

  ${competitors.length > 0 ? `
  <div class="section">
    <div class="section-label">Competitor Benchmarks</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;font-size:10px;font-weight:600;color:#9CA3AF;padding-bottom:6px;">Business</th>
          <th style="text-align:right;font-size:10px;font-weight:600;color:#9CA3AF;padding-bottom:6px;padding-left:16px;">Score</th>
          <th style="text-align:right;font-size:10px;font-weight:600;color:#9CA3AF;padding-bottom:6px;padding-left:12px;">vs You</th>
          <th style="text-align:left;font-size:10px;font-weight:600;color:#9CA3AF;padding-bottom:6px;padding-left:16px;">Key Advantage</th>
        </tr>
      </thead>
      <tbody>${compRows}</tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    <div class="left">Prepared for ${scan.business_name} · Confidential</div>
    <div class="right">Powered by <strong>Geothority.io</strong></div>
  </div>

</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      // Small delay lets styles render before print dialog opens
      setTimeout(() => {
        win.print();
        setGenerating(false);
      }, 400);
    } else {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={generating}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-sm font-medium text-[var(--foreground)] transition-colors disabled:opacity-50"
    >
      {generating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {generating ? "Building report…" : "Export PDF"}
    </button>
  );
}
