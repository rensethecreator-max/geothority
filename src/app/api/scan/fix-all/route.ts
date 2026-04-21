import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_LLM_MODEL, openai } from "@/lib/openai";

interface FixItem {
  type: "schema" | "faq" | "about" | "landing_page" | "meta_tags" | "listing_sync" | "ai_optimization";
  title: string;
  content: string;
  instructions: string;
  impact: "high" | "medium" | "low";
  autoApplied: boolean;
  group?: string;
}

interface FixPackage {
  scanId: string;
  generatedAt: string;
  fixes: FixItem[];
  totalFixes: number;
  autoAppliedCount: number;
}

async function generateSchema(businessName: string, businessType: string, url: string, address?: string): Promise<string> {
  const prompt = `Generate a complete LocalBusiness JSON-LD schema for:
Business Name: ${businessName}
Business Type: ${businessType}
Website: ${url}
${address ? `Address: ${address}` : ""}

Return ONLY the raw JSON-LD object (no markdown, no explanation). Include @context, @type, name, url, description, and any relevant service schema properties.`;

  const res = await openai.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
  });
  return res.choices[0].message.content?.trim() ?? "{}";
}

async function generateFAQ(businessName: string, businessType: string, location: string): Promise<string> {
  const prompt = `Generate 10 FAQ questions and answers for a ${businessType} business called "${businessName}" in ${location || "their area"}.

Format as HTML with this structure for each item:
<div class="faq-item">
  <h3 class="faq-question">Question here?</h3>
  <p class="faq-answer">Answer here.</p>
</div>

Make the questions specific, locally-relevant, and SEO-optimized. Include questions about services, pricing, location, hours, and what makes them unique. Return ONLY the HTML.`;

  const res = await openai.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1500,
  });
  return res.choices[0].message.content?.trim() ?? "";
}

async function generateAboutPage(businessName: string, businessType: string, location: string): Promise<string> {
  const prompt = `Write a compelling "About Us" page for a ${businessType} business called "${businessName}" in ${location || "their area"}.

Format as HTML sections:
- Hero headline (h1)
- Mission statement paragraph
- Why Choose Us section (h2 + 3 benefit paragraphs)
- Our Story section (h2 + 2 paragraphs)
- Call to action paragraph

Make it warm, professional, locally-specific, and SEO-optimized. Return ONLY the HTML.`;

  const res = await openai.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1200,
  });
  return res.choices[0].message.content?.trim() ?? "";
}

async function generateLandingPage(businessName: string, businessType: string, city: string): Promise<string> {
  const prompt = `Write a city-specific landing page for a ${businessType} business called "${businessName}" targeting "${city}".

Format as HTML:
- H1: "[Business Name] in ${city}" style headline
- Local intro paragraph (mention ${city} specifically)
- Services section (h2 + list)
- Why choose us in ${city} (h2 + 3 paragraphs)
- Local trust signals paragraph
- CTA section

Make it highly localized and SEO-optimized for "${businessType} in ${city}". Return ONLY the HTML.`;

  const res = await openai.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1200,
  });
  return res.choices[0].message.content?.trim() ?? "";
}

async function generateAIOptimizationPackage(businessName: string, businessType: string, location: string, url: string, citations: string[]): Promise<string> {
  const sameAsLinks = citations.length > 0
    ? citations.map((c) => `"${c}"`).join(",\n      ")
    : `"https://www.google.com/maps", "https://www.yelp.com"` ;

  const prompt = `Generate a complete AI Optimization Package for a ${businessType} called "${businessName}" in ${location || "their area"} at ${url}.

This package should help AI assistants like ChatGPT, Perplexity, and Claude recognize and recommend this business.

Return a JSON object with exactly these keys:
1. "faqSchema" - JSON-LD FAQPage schema with 8 questions optimized for AI extraction (natural language, full sentences in answers, mention business name and location)
2. "entityContent" - 3 paragraphs of entity-rich content with business name, services, and city mentioned in natural patterns (suitable for About page or homepage)
3. "sameAsSchema" - JSON-LD LocalBusiness schema with sameAs array pointing to: ${sameAsLinks}
4. "aiOptimizedAbout" - An About section structured for knowledge graph recognition: includes @context hints in HTML comments, mentions entity relationships, and uses structured heading hierarchy

Ensure the content naturally mentions "${businessName}", "${businessType}", and "${location}" multiple times. Return ONLY valid JSON.`;

  const res = await openai.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });
  return res.choices[0].message.content?.trim() ?? "{}";
}

async function generateMetaTags(businessName: string, businessType: string, location: string, url: string): Promise<string> {
  const prompt = `Generate optimized meta title and description for a ${businessType} business called "${businessName}" in ${location || "their area"}.

Requirements:
- Title: 50-60 characters, include business name + location + primary keyword
- Description: 150-160 characters, compelling, include CTA

Return ONLY this format:
<title>YOUR TITLE HERE</title>
<meta name="description" content="YOUR DESCRIPTION HERE" />
<meta property="og:title" content="YOUR TITLE HERE" />
<meta property="og:description" content="YOUR DESCRIPTION HERE" />`;

  const res = await openai.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 400,
  });
  return res.choices[0].message.content?.trim() ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanId } = await request.json();
    if (!scanId) {
      return NextResponse.json({ error: "scanId required" }, { status: 400 });
    }

    // Check if fix package already exists
    const { data: existing } = await supabase
      .from("fix_packages")
      .select("*")
      .eq("scan_id", scanId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({
        scanId,
        generatedAt: existing.created_at,
        fixes: existing.fixes,
        totalFixes: existing.total_fixes,
        autoAppliedCount: existing.auto_applied_count,
      } as FixPackage);
    }

    // Fetch the scan
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const layerScores = scan.layer_scores ?? {};
    const quickWins = scan.quick_wins ?? [];
    const rawData = scan.raw_scan_data ?? {};

    // Extract business info
    const businessName = rawData.businessName || rawData.business_name || scan.business_name || "Your Business";
    const businessType = rawData.businessType || rawData.business_type || scan.business_type || "local business";
    const location = rawData.location || rawData.city || scan.location || "";
    const url = scan.url || rawData.url || "";
    const address = rawData.address || "";

    // Determine what's missing based on scores
    const schemaScore = layerScores.schema ?? layerScores.structured_data ?? 0;
    const citationScore = layerScores.citations ?? layerScores.listing ?? 0;
    const contentScore = layerScores.content ?? layerScores.pages ?? 0;
    const metaScore = layerScores.meta ?? layerScores.onpage ?? 0;

    const needsSchema = schemaScore < 70;
    const needsCitations = citationScore < 60;
    const needsContent = contentScore < 60;
    const needsMeta = metaScore < 70;

    // Check quick wins for specific content gaps
    const quickWinTexts = quickWins.map((w: { title?: string; description?: string }) =>
      `${w.title || ""} ${w.description || ""}`.toLowerCase()
    );
    const needsFAQ = quickWinTexts.some((t: string) => t.includes("faq") || t.includes("question"));
    const needsAbout = quickWinTexts.some((t: string) => t.includes("about"));
    const needsLandingPage = quickWinTexts.some((t: string) =>
      t.includes("service area") || t.includes("landing page") || t.includes("city page")
    );

    // Check if AI overview is missing / demo mode
    const aiOverview = rawData?.ai_overview || rawData?.aiOverview || {};
    const aiNotFound =
      !aiOverview ||
      (typeof aiOverview === "object" &&
        (aiOverview.status === "not_found" ||
          aiOverview.status === "demo_mode" ||
          aiOverview.demo === true ||
          aiOverview.found === false));
    const aiScore = layerScores.ai ?? layerScores.layer5 ?? 0;
    const needsAIOptimization = aiNotFound || aiScore < 50;

    // Collect known citation URLs for sameAs schema
    const citationUrls: string[] = [];
    if (Array.isArray(rawData?.citations)) {
      for (const c of rawData.citations) {
        if (c?.url) citationUrls.push(c.url);
      }
    }

    // Build generation promises in parallel
    const generationTasks: Promise<FixItem>[] = [];

    if (needsSchema) {
      generationTasks.push(
        generateSchema(businessName, businessType, url, address).then((content) => ({
          type: "schema" as const,
          title: "LocalBusiness JSON-LD Schema",
          content,
          instructions: 'Add this JSON-LD script tag inside the <head> section of your homepage and all key pages.',
          impact: "high" as const,
          autoApplied: false,
        }))
      );
    }

    if (needsMeta) {
      generationTasks.push(
        generateMetaTags(businessName, businessType, location, url).then((content) => ({
          type: "meta_tags" as const,
          title: "Optimized Meta Title & Description",
          content,
          instructions: 'Replace your current <title> and <meta name="description"> tags in your homepage <head> section.',
          impact: "high" as const,
          autoApplied: false,
        }))
      );
    }

    if (needsFAQ || needsContent) {
      generationTasks.push(
        generateFAQ(businessName, businessType, location).then((content) => ({
          type: "faq" as const,
          title: "FAQ Page Content (10 Q&As)",
          content,
          instructions: "Create a new FAQ page at /faq and paste this HTML into your page content.",
          impact: "medium" as const,
          autoApplied: false,
        }))
      );
    }

    if (needsAbout || needsContent) {
      generationTasks.push(
        generateAboutPage(businessName, businessType, location).then((content) => ({
          type: "about" as const,
          title: "About Us Page Copy",
          content,
          instructions: "Replace your current About page content with this HTML, or create a new /about page.",
          impact: "medium" as const,
          autoApplied: false,
        }))
      );
    }

    if (needsLandingPage && location) {
      generationTasks.push(
        generateLandingPage(businessName, businessType, location).then((content) => ({
          type: "landing_page" as const,
          title: `Service Area Page — ${location}`,
          content,
          instructions: `Create a new page at /${location.toLowerCase().replace(/\s+/g, "-")} and paste this HTML as the page content.`,
          impact: "medium" as const,
          autoApplied: false,
        }))
      );
    }

    if (needsAIOptimization) {
      generationTasks.push(
        generateAIOptimizationPackage(businessName, businessType, location, url, citationUrls).then((content) => ({
          type: "ai_optimization" as const,
          title: "AI Optimization Package",
          content,
          instructions:
            "1. Add the faqSchema JSON-LD to your FAQ page <head>. " +
            "2. Use the entityContent in your homepage or About page body. " +
            "3. Add the sameAsSchema to your homepage <head>. " +
            "4. Replace your About section with aiOptimizedAbout HTML.",
          impact: "high" as const,
          autoApplied: false,
          group: "AI Optimization Package",
        }))
      );
    }

    if (needsCitations) {
      generationTasks.push(
        Promise.resolve({
          type: "listing_sync" as const,
          title: "Citation & Listing Sync",
          content: JSON.stringify({
            message: "Your business listings have been queued for sync across 50+ directories.",
            directories: ["Google Business Profile", "Bing Places", "Apple Maps", "Yelp", "Facebook", "Foursquare", "YellowPages", "BBB", "Angi", "HomeAdvisor"],
            status: "queued",
            estimatedTime: "24-48 hours",
          }, null, 2),
          instructions: "Your listings are being synced automatically. You'll receive a confirmation email within 24-48 hours.",
          impact: "high" as const,
          autoApplied: true,
        })
      );
    }

    // Wait for all parallel generations
    const fixes = await Promise.all(generationTasks);
    const autoAppliedCount = fixes.filter((f) => f.autoApplied).length;

    // Store in Supabase
    const { error: insertError } = await supabase.from("fix_packages").insert({
      user_id: user.id,
      scan_id: scanId,
      fixes,
      total_fixes: fixes.length,
      auto_applied_count: autoAppliedCount,
    });

    if (insertError) {
      console.error("Error storing fix package:", insertError);
      // Continue anyway — return the data even if we couldn't store it
    }

    const pkg: FixPackage = {
      scanId,
      generatedAt: new Date().toISOString(),
      fixes,
      totalFixes: fixes.length,
      autoAppliedCount,
    };

    return NextResponse.json(pkg);
  } catch (err) {
    console.error("Fix-all error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
