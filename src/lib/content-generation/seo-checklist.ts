// ============================================================
// Content Generation Module – SEO Checklist Validator
// ============================================================

import type { SEOChecklistResult } from "./types";

/**
 * Validates generated content against SEO best practices.
 * Returns a checklist with pass/fail for each criterion and an overall score.
 */
export function validateSEO(params: {
  title: string;
  metaTitle: string;
  metaDescription: string;
  contentHtml: string;
  contentMarkdown: string;
  city: string;
  primaryKeyword: string;
  cityMentionRange: { min: number; max: number };
  targetWordCount: { min: number; max: number };
}): SEOChecklistResult {
  const html = params.contentHtml || "";
  const md = params.contentMarkdown || "";
  const combinedText = html + " " + md;

  // Title checks
  const titleUnder60 = (params.metaTitle?.length || 0) <= 60;
  const metaUnder160 = (params.metaDescription?.length || 0) <= 160;

  // H1 check
  const hasH1 = /<h1[^>]*>/i.test(html) || /^#\s/.test(md);

  // Heading hierarchy check (no H3 without H2 before it, etc.)
  const headingHierarchy = checkHeadingHierarchy(html, md);

  // City mentions
  const cityRegex = new RegExp(params.city, "gi");
  const cityMentions = (combinedText.match(cityRegex) || []).length;

  // Keyword in title
  const keywordInTitle = params.title.toLowerCase().includes(params.primaryKeyword.toLowerCase());

  // Keyword in first paragraph
  const firstParagraph = extractFirstParagraph(html, md);
  const keywordInFirstParagraph = firstParagraph.toLowerCase().includes(params.primaryKeyword.toLowerCase());

  // Internal links
  const hasInternalLinks = /<a[^>]*href=["']\/[^"']*["']/i.test(html) || /\[.*?\]\(\/[^\)]*\)/.test(md);

  // Schema
  const hasSchema = html.includes('schema.org') || html.includes('application/ld+json');

  // Word count (strip HTML tags)
  const plainText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const mdPlainText = md.replace(/[#*_\[\]\(\)]/g, "").replace(/\s+/g, " ").trim();
  const wordCount = (plainText + " " + mdPlainText).split(/\s+/).filter(Boolean).length;

  // Calculate overall score (weighted)
  let score = 0;
  if (titleUnder60) score += 10;
  if (metaUnder160) score += 10;
  if (hasH1) score += 10;
  if (headingHierarchy) score += 10;
  if (cityMentions >= params.cityMentionRange.min && cityMentions <= params.cityMentionRange.max) score += 15;
  else if (cityMentions >= params.cityMentionRange.min - 2) score += 8;
  if (keywordInTitle) score += 10;
  if (keywordInFirstParagraph) score += 10;
  if (hasInternalLinks) score += 5;
  if (hasSchema) score += 10;
  if (wordCount >= params.targetWordCount.min && wordCount <= params.targetWordCount.max) score += 10;
  else if (wordCount >= params.targetWordCount.min * 0.8) score += 5;

  return {
    titleUnder60Chars: titleUnder60,
    metaUnder160Chars: metaUnder160,
    hasH1,
    headingHierarchy,
    cityMentions,
    keywordInTitle,
    keywordInFirstParagraph,
    hasInternalLinks,
    hasSchema,
    wordCount,
    overallScore: score,
  };
}

function checkHeadingHierarchy(html: string, md: string): boolean {
  // Check HTML headings
  const htmlHeadings = Array.from(html.matchAll(/<h([1-6])[^>]*>/gi)).map((m) => parseInt(m[1]));
  // Check markdown headings
  const mdHeadings = Array.from(md.matchAll(/^(#{1,6})\s/gm)).map((m) => m[1].length);

  const headings = [...htmlHeadings, ...mdHeadings].filter((h) => h >= 1 && h <= 6);
  if (headings.length === 0) return false;

  // Check no heading skips more than one level
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] - headings[i - 1] > 1 && headings[i] > headings[i - 1]) {
      return false;
    }
  }
  return true;
}

function extractFirstParagraph(html: string, md: string): string {
  // From HTML
  const htmlMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (htmlMatch) return htmlMatch[1].replace(/<[^>]*>/g, "");

  // From markdown
  const mdMatch = md.match(/^[^#\s].*/m);
  if (mdMatch) return mdMatch[0];

  return "";
}
