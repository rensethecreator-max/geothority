/**
 * Report Builder — Combines citation health + link authority into unified report
 * Generates the action plan with prioritized steps
 */

import {
  CitationHealthReport,
  LinkAuthoritySummary,
  LinkOpportunity,
  DeepCitationAndLinkReport,
  ActionPlan,
  ActionItem,
  CitationIssue,
} from "./types";
import { generateCitationHealthReport } from "./citation-analyzer";
import { generateLinkOpportunities, buildLinkAuthoritySummary, enrichOpportunitiesWithAI, LinkProspectConfig } from "./link-prospector";
import { CitationCheckConfig } from "./types";

// ─── Action Plan Generation ────────────────────────────────────────────────────

function buildActionPlan(
  citationReport: CitationHealthReport,
  linkOpportunities: LinkOpportunity[]
): ActionPlan {
  const immediate: ActionItem[] = [];
  const thisWeek: ActionItem[] = [];
  const thisMonth: ActionItem[] = [];
  const automated: ActionItem[] = [];

  // ── Immediate: Critical citation fixes (NAP mismatches on key directories) ──
  for (const fix of citationReport.prioritizedFixes) {
    if (fix.issue.severity === "critical" && (fix.tier === "critical" || fix.tier === "major")) {
      immediate.push({
        title: `Fix ${fix.issue.field} on ${fix.directory}`,
        description: fix.issue.fixAction,
        type: "citation_fix",
        estimatedImpact: 90,
        estimatedTimeMin: fix.estimatedTimeMin,
        actionUrl: null,
      });
    }
  }

  // Missing critical citations
  for (const missing of citationReport.missingOpportunities) {
    if (missing.tier === "critical") {
      immediate.push({
        title: `Claim ${missing.directory} listing`,
        description: `Your business is not listed on ${missing.directory}. ${missing.reason}`,
        type: "citation_claim",
        estimatedImpact: 85,
        estimatedTimeMin: 15,
        actionUrl: missing.claimUrl,
      });
    }
  }

  // ── This Week: Major fixes + easy link wins ──
  for (const fix of citationReport.prioritizedFixes) {
    if (fix.issue.severity === "high" || (fix.issue.severity === "critical" && fix.tier !== "critical")) {
      thisWeek.push({
        title: `Update ${fix.issue.field} on ${fix.directory}`,
        description: fix.issue.fixAction,
        type: "citation_fix",
        estimatedImpact: 70,
        estimatedTimeMin: fix.estimatedTimeMin,
        actionUrl: null,
      });
    }
  }

  // Easy link opportunities
  const easyLinks = linkOpportunities.filter(o => o.difficulty === "easy" && o.priority >= 60);
  for (const link of easyLinks.slice(0, 5)) {
    thisWeek.push({
      title: `Submit to ${link.websiteName}`,
      description: link.suggestedAngle,
      type: "outreach",
      estimatedImpact: Math.round(link.estimatedDa * 0.8),
      estimatedTimeMin: 20,
      actionUrl: link.url,
    });
  }

  // ── This Month: Medium fixes + harder link building ──
  for (const fix of citationReport.prioritizedFixes) {
    if (fix.issue.severity === "medium") {
      thisMonth.push({
        title: `Fix ${fix.issue.field} on ${fix.directory}`,
        description: fix.issue.fixAction,
        type: "citation_fix",
        estimatedImpact: 40,
        estimatedTimeMin: fix.estimatedTimeMin,
        actionUrl: null,
      });
    }
  }

  const mediumLinks = linkOpportunities.filter(o => o.difficulty === "medium");
  for (const link of mediumLinks.slice(0, 8)) {
    thisMonth.push({
      title: `Outreach to ${link.websiteName}`,
      description: link.suggestedAngle,
      type: "outreach",
      estimatedImpact: Math.round(link.estimatedDa * 0.6),
      estimatedTimeMin: 30,
      actionUrl: link.url,
    });
  }

  // Hard links
  const hardLinks = linkOpportunities.filter(o => o.difficulty === "hard");
  for (const link of hardLinks.slice(0, 3)) {
    thisMonth.push({
      title: `Strategic outreach: ${link.websiteName}`,
      description: link.suggestedAngle,
      type: "outreach",
      estimatedImpact: Math.round(link.estimatedDa * 0.5),
      estimatedTimeMin: 60,
      actionUrl: link.url,
    });
  }

  // ── Automated: Things the system can auto-fix ──
  for (const fix of citationReport.prioritizedFixes) {
    if (fix.issue.autoFixable) {
      automated.push({
        title: `Auto-fix: ${fix.issue.field} on ${fix.directory}`,
        description: fix.issue.fixAction,
        type: "technical",
        estimatedImpact: 60,
        estimatedTimeMin: 0,
        actionUrl: null,
      });
    }
  }

  // Auto-generate outreach emails for top easy opportunities
  for (const link of easyLinks.slice(0, 3)) {
    automated.push({
      title: `Generate outreach email for ${link.websiteName}`,
      description: `AI will draft a personalized outreach email based on ${link.suggestedAngle}`,
      type: "content",
      estimatedImpact: Math.round(link.estimatedDa * 0.7),
      estimatedTimeMin: 0,
      actionUrl: null,
    });
  }

  return { immediate, thisWeek, thisMonth, automated };
}

function calculateCombinedScore(
  citationScore: number,
  linkAuthority: LinkAuthoritySummary
): number {
  // Citation health is 60% of combined, link authority is 40%
  const citationWeight = 0.6;
  const linkWeight = 0.4;

  // Normalize link authority score (based on opportunities found vs potential)
  const linkScore = Math.min(
    100,
    Math.round(
      (linkAuthority.avgDa * 0.3 +
        linkAuthority.avgRelevance * 0.3 +
        linkAuthority.avgLocality * 0.2 +
        (linkAuthority.totalOpportunities > 5 ? 20 : linkAuthority.totalOpportunities * 4))
    )
  );

  return Math.round(citationScore * citationWeight + linkScore * linkWeight);
}

// ─── Main Report Generator ──────────────────────────────────────────────────────

export interface DeepCitationReportConfig extends CitationCheckConfig {
  industry: string;
  categories: string[];
  services: string[];
  hours?: import("./types").BusinessHours;
  website?: string;
}

export async function generateDeepCitationAndLinkReport(
  config: DeepCitationReportConfig
): Promise<DeepCitationAndLinkReport> {
  // Run citation analysis
  const citationHealth = await generateCitationHealthReport(config);

  // Generate link opportunities
  const linkProspectConfig: LinkProspectConfig = {
    businessName: config.businessName,
    city: config.city,
    state: config.state,
    industry: config.industry,
    categories: config.categories,
    website: config.website || "",
    phone: config.phone,
  };

  let linkOpportunities = generateLinkOpportunities(linkProspectConfig);

  // Enrich top opportunities with AI (if available)
  linkOpportunities = await enrichOpportunitiesWithAI(linkOpportunities, linkProspectConfig);

  const linkAuthority = buildLinkAuthoritySummary(linkOpportunities);

  // Build action plan
  const actionPlan = buildActionPlan(citationHealth, linkOpportunities);

  // Combined score
  const combinedScore = calculateCombinedScore(
    citationHealth.overall.score,
    linkAuthority
  );

  return {
    citationHealth,
    linkAuthority,
    combinedScore,
    actionPlan,
  };
}

/**
 * Generate a markdown-formatted report for display/export
 */
export function formatReportAsMarkdown(report: DeepCitationAndLinkReport): string {
  const { citationHealth: ch, linkAuthority: la, combinedScore, actionPlan } = report;

  return `# Deep Citation & Local Link Authority Report
## ${ch.businessName} — ${ch.location}
*Generated: ${new Date(ch.generatedAt).toLocaleDateString()}*

---

## 📊 Overall Score: ${combinedScore}/100

### Citation Health: ${ch.overall.grade} (${ch.overall.score}/100)
| Metric | Value |
|--------|-------|
| Directories Checked | ${ch.overall.totalDirectories} |
| Found In | ${ch.overall.foundIn} |
| Consistency Score | ${ch.overall.consistencyScore}% |
| Category Match Rate | ${ch.overall.categoryMatchRate}% |
| Service Match Rate | ${ch.overall.serviceMatchRate}% |
| Hours Accuracy | ${ch.overall.hoursAccuracyRate}% |

### Tier Breakdown
| Tier | Total | Found | Avg Score | Issues |
|------|-------|-------|-----------|--------|
${Object.entries(ch.tierBreakdown).map(([tier, summary]: [string, any]) =>
  `| ${tier} | ${summary.total} | ${summary.found} | ${summary.avgConsistency}% | ${summary.issues} |`
).join("\n")}

### Field Analysis
| Field | Match Rate | Mismatches | Missing |
|-------|-----------|------------|---------|
${Object.entries(ch.fieldAnalysis).map(([field, summary]: [string, any]) =>
  `| ${field} | ${summary.matchRate}% | ${summary.mismatchCount} | ${summary.missingCount} |`
).join("\n")}

---

## 🔗 Link Authority Summary

| Metric | Value |
|--------|-------|
| Total Opportunities | ${la.totalOpportunities} |
| Average DA | ${la.avgDa} |
| Average Relevance | ${la.avgRelevance}/100 |
| Average Locality | ${la.avgLocality}/100 |
| Easy Wins | ${la.byDifficulty.easy} |
| Medium Effort | ${la.byDifficulty.medium} |
| Hard / Strategic | ${la.byDifficulty.hard} |

### Top 10 Link Opportunities
| # | Source | Type | DA | Difficulty | Angle |
|---|--------|------|----|-----------|-------|
${la.topOpportunities.map((o, i) =>
  `| ${i + 1} | ${o.websiteName} | ${o.type} | ${o.estimatedDa} | ${o.difficulty} | ${o.suggestedAngle.slice(0, 60)}… |`
).join("\n")}

---

## ⚡ Action Plan

### Immediate (Today)
${actionPlan.immediate.length ? actionPlan.immediate.map(a =>
  `- **${a.title}** (Impact: ${a.estimatedImpact}/100, ~${a.estimatedTimeMin} min)`
).join("\n") : "No immediate actions required!"}

### This Week
${actionPlan.thisWeek.length ? actionPlan.thisWeek.map(a =>
  `- **${a.title}** (Impact: ${a.estimatedImpact}/100, ~${a.estimatedTimeMin} min)`
).join("\n") : "Nothing urgent this week."}

### This Month
${actionPlan.thisMonth.length ? actionPlan.thisMonth.map(a =>
  `- **${a.title}** (Impact: ${a.estimatedImpact}/100, ~${a.estimatedTimeMin} min)`
).join("\n") : "No monthly tasks."}

### Automated
${actionPlan.automated.length ? actionPlan.automated.map(a =>
  `- **${a.title}** (Impact: ${a.estimatedImpact}/100, auto)`
).join("\n") : "No auto-fixes available yet."}

---

## 🚨 Critical Issues (${ch.criticalIssues.length})

${ch.criticalIssues.length ? ch.criticalIssues.map(i =>
  `- **[${i.severity.toUpperCase()}] ${i.field}**: ${i.issue}\n  Impact: ${i.impact}\n  Fix: ${i.fixAction}`
).join("\n\n") : "No critical issues found!"}

---

## 📋 Missing Citations (${ch.missingOpportunities.length})

${ch.missingOpportunities.length ? ch.missingOpportunities.map(m =>
  `- **${m.directory}** (${m.tier} tier, ~DA ${m.estimatedDa})\n  ${m.reason}\n  [Claim](${m.claimUrl})`
).join("\n\n") : "All identified directories have listings."}

---
*Report powered by Geothority Deep Citation & Link Authority Module*
`;
}
