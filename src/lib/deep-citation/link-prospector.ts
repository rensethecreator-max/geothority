/**
 * Local Link Prospector — AI-driven local backlink opportunity finder
 * Identifies relevant local websites and generates personalized outreach templates
 */

import {
  LinkOpportunity,
  LinkOpportunityType,
  LinkAuthoritySummary,
  OutreachTemplate,
} from "./types";

// ─── Local Link Source Templates ──────────────────────────────────────────────

interface LinkSourceTemplate {
  type: LinkOpportunityType;
  namePattern: string;
  urlPatterns: string[];
  searchQuery: string;
  typicalDa: number;
  difficulty: "easy" | "medium" | "hard";
  contactMethod: "email" | "form" | "social" | "phone";
  angleTemplate: string;
  outreachContext: string;
}

const LOCAL_LINK_SOURCES: LinkSourceTemplate[] = [
  // Chamber of Commerce
  {
    type: "chamber_of_commerce",
    namePattern: "{city} Chamber of Commerce",
    urlPatterns: ["{city}chamber.org", "chamber.{city}.com", "{city}chamber.com"],
    searchQuery: "{city} {state} chamber of commerce member directory",
    typicalDa: 55,
    difficulty: "medium",
    contactMethod: "form",
    angleTemplate: "Join the local chamber for a directory listing + networking events + credibility boost",
    outreachContext: "Chamber membership provides a high-trust local backlink and community credibility signal",
  },
  // Industry associations
  {
    type: "industry_association",
    namePattern: "{state} {industry} Association",
    urlPatterns: ["{industry}association.{state}.org"],
    searchQuery: "{state} {industry} association member directory",
    typicalDa: 60,
    difficulty: "medium",
    contactMethod: "form",
    angleTemplate: "Join the {state} {industry} association for a member profile + referral network",
    outreachContext: "Industry association links carry topical authority and trust signals",
  },
  // Local blogs
  {
    type: "local_blog",
    namePattern: "{city} {topic} Blog",
    urlPatterns: ["{city}blog.com", "{city}life.com"],
    searchQuery: "{city} {state} local blog {industry} feature",
    typicalDa: 40,
    difficulty: "easy",
    contactMethod: "email",
    angleTemplate: "Offer a guest post about {industry} tips for {city} residents",
    outreachContext: "Local blog features create geographically relevant backlinks with real readership",
  },
  // Local news
  {
    type: "news_outlet",
    namePattern: "{city} News / {city} Tribune",
    urlPatterns: ["{city}news.com", "{city}tribune.com"],
    searchQuery: "{city} {state} local newspaper business feature",
    typicalDa: 70,
    difficulty: "hard",
    contactMethod: "email",
    angleTemplate: "Pitch a local business story: how {business} serves {city} residents",
    outreachContext: "News backlinks are high-DA, authoritative, and carry strong local trust signals",
  },
  // Sponsorships
  {
    type: "sponsorship",
    namePattern: "{city} {event} Sponsorship",
    urlPatterns: ["{event}{city}.org"],
    searchQuery: "{city} {state} community event sponsorship opportunity",
    typicalDa: 45,
    difficulty: "medium",
    contactMethod: "email",
    angleTemplate: "Sponsor a local event for a backlink on the event website + community visibility",
    outreachContext: "Sponsorship links are natural, local, and signal community engagement",
  },
  // Local events
  {
    type: "local_event",
    namePattern: "{city} Community Events",
    urlPatterns: ["{city}events.com", "events.{city}.org"],
    searchQuery: "{city} {state} community events calendar business listing",
    typicalDa: 40,
    difficulty: "easy",
    contactMethod: "form",
    angleTemplate: "Submit your business event/hosting to the {city} community calendar",
    outreachContext: "Event calendar listings are easy wins with local relevance",
  },
  // Resource pages
  {
    type: "resource_page",
    namePattern: "{city} {industry} Resources",
    urlPatterns: ["{city}.gov", "{city}resources.com"],
    searchQuery: "{city} {state} {industry} resources helpful links",
    typicalDa: 50,
    difficulty: "medium",
    contactMethod: "email",
    angleTemplate: "Get listed on the {city} {industry} resource page as a local provider",
    outreachContext: "Resource page links are editorial and pass strong topical authority",
  },
  // Testimonial opportunities
  {
    type: "testimonial",
    namePattern: "{vendor} Testimonial Page",
    urlPatterns: ["{vendor}.com/testimonials"],
    searchQuery: "{industry} vendor testimonials page submit",
    typicalDa: 55,
    difficulty: "easy",
    contactMethod: "form",
    angleTemplate: "Provide a testimonial for a tool/service you use in exchange for a backlink",
    outreachContext: "Testimonial links are the easiest backlinks — you give a review, they give a link",
  },
  // Guest post
  {
    type: "guest_post",
    namePattern: "{industry} Blog Guest Post",
    urlPatterns: ["{industry}blog.com/write-for-us"],
    searchQuery: "{industry} blog write for us guest post {state}",
    typicalDa: 45,
    difficulty: "medium",
    contactMethod: "email",
    angleTemplate: "Write an expert guest post about {industry} best practices for {city} homeowners",
    outreachContext: "Guest posts build topical authority and generate contextual backlinks",
  },
  // HARO / journalist queries
  {
    type: "haro",
    namePattern: "HARO / Connectively",
    urlPatterns: ["connectively.us", "haro.com"],
    searchQuery: "HARO queries {industry} expert source",
    typicalDa: 80,
    difficulty: "hard",
    contactMethod: "email",
    angleTemplate: "Respond to journalist queries as a local {industry} expert in {city}",
    outreachContext: "HARO links come from high-DA news sites and carry massive authority",
  },
  // Local university
  {
    type: "local_university",
    namePattern: "{city} University / College",
    urlPatterns: ["{city}u.edu", "{city}college.edu"],
    searchQuery: "{city} {state} university college local business partnership resource",
    typicalDa: 85,
    difficulty: "hard",
    contactMethod: "email",
    angleTemplate: "Offer a student discount or internship to earn a .edu backlink",
    outreachContext: ".edu backlinks are among the strongest trust signals in SEO",
  },
  // Government resource
  {
    type: "government_resource",
    namePattern: "{city}.gov Resources",
    urlPatterns: ["{city}.gov", "{state}.gov"],
    searchQuery: "site:{city}.gov business directory OR resource OR vendor list",
    typicalDa: 80,
    difficulty: "hard",
    contactMethod: "form",
    angleTemplate: "Apply for the city's approved vendor list or business resource page",
    outreachContext: ".gov backlinks are the gold standard for trust and authority",
  },
  // Scholarship link building
  {
    type: "scholarship",
    namePattern: "{city} University Scholarship",
    urlPatterns: ["{city}u.edu/scholarships"],
    searchQuery: "{city} {state} university scholarship external listing opportunity",
    typicalDa: 75,
    difficulty: "medium",
    contactMethod: "email",
    angleTemplate: "Create a $500 scholarship for {city} students — .edu sites love linking to these",
    outreachContext: "Scholarship link building is a proven tactic for earning .edu backlinks at scale",
  },
  // Local directories (additional niche ones beyond citation scan)
  {
    type: "local_directory",
    namePattern: "{city} Local Directory",
    urlPatterns: ["{city}directory.com"],
    searchQuery: "{city} {state} local business directory submit listing",
    typicalDa: 35,
    difficulty: "easy",
    contactMethod: "form",
    angleTemplate: "Submit your business to the {city} local directory for a free backlink",
    outreachContext: "Local directories provide easy backlinks with geographic relevance",
  },
];

// ─── Opportunity Generation ────────────────────────────────────────────────────

export interface LinkProspectConfig {
  businessName: string;
  city: string;
  state: string;
  industry: string;        // e.g., "plumbing", "dentistry", "law"
  categories: string[];
  website: string;
  phone?: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function generateOutreachTemplate(
  source: LinkSourceTemplate,
  config: LinkProspectConfig,
  contactName?: string
): OutreachTemplate {
  const { businessName, city, state, industry } = config;
  const greeting = contactName ? `Hi ${contactName}` : `Hi there`;

  // Subject line
  let subject: string;
  if (source.type.includes("chamber")) {
    subject = `${businessName} — Interested in Joining the ${city} Chamber`;
  } else if (source.type === "guest_post") {
    subject = `Guest Post Pitch: ${industry} Expertise for ${city} Readers`;
  } else if (source.type === "haro") {
    subject = `Expert Source: ${businessName} — ${industry} in ${city}, ${state}`;
  } else if (source.type === "testimonial") {
    subject = `Testimonial from ${businessName} — Happy Customer`;
  } else if (source.type === "scholarship") {
    subject = `${businessName} Community Scholarship for ${city} Students`;
  } else if (source.type === "sponsorship") {
    subject = `${businessName} — Sponsorship Inquiry for ${city} Events`;
  } else {
    subject = `${businessName} — ${industry} in ${city}, ${state}`;
  }

  // Body
  let body: string;
  if (source.type.includes("chamber")) {
    body = [
      `${greeting},`,
      ``,
      `I'm reaching out on behalf of ${businessName}, a ${industry} business serving ${city}, ${state}. We're interested in joining the ${city} Chamber of Commerce and being listed in your member directory.`,
      ``,
      `We've been serving the ${city} community and would love to connect with other local businesses through the chamber. Could you share membership details and how to get our listing set up?`,
      ``,
      `Thanks!`,
      `${businessName}`,
      `${config.website}`,
    ].join("\n");
  } else if (source.type === "guest_post") {
    body = [
      `${greeting},`,
      ``,
      `I'm writing from ${businessName}, a ${industry} company based in ${city}. We'd love to contribute a guest post to your blog.`,
      ``,
      `Topic ideas:`,
      `- "Top ${industry} Tips for ${city} Homeowners in ${state}"`,
      `- "What ${city} Residents Should Know About ${industry}"`,
      `- "How to Choose a ${industry} Professional in ${city}"`,
      ``,
      `We'd provide original, well-researched content with no promotional fluff. Happy to send a full outline for your review.`,
      ``,
      `Best,`,
      `${businessName}`,
      `${config.website}`,
    ].join("\n");
  } else if (source.type === "haro") {
    body = [
      `${greeting},`,
      ``,
      `I saw your query about ${industry} and wanted to offer ${businessName} as a source. We're a ${industry} business in ${city}, ${state} with deep expertise in ${config.categories.slice(0, 3).join(", ")}.`,
      ``,
      `Happy to provide quotes, data, or a local perspective for your story.`,
      ``,
      `Best,`,
      `${businessName}`,
      `${config.website}`,
    ].join("\n");
  } else if (source.type === "testimonial") {
    body = [
      `${greeting},`,
      ``,
      `We've been using your product/service at ${businessName} and have had a great experience. We'd love to share a testimonial if you're collecting them.`,
      ``,
      `Would you be open to featuring our testimonial with a link to our website? We're a ${industry} business in ${city}, ${state}.`,
      ``,
      `Thanks!`,
      `${businessName}`,
    ].join("\n");
  } else if (source.type === "scholarship") {
    body = [
      `${greeting},`,
      ``,
      `${businessName} is launching a $500 community scholarship for students in ${city}, ${state}. We'd love to have it listed on your scholarships page.`,
      ``,
      `Details:`,
      `- Name: ${businessName} Community Scholarship`,
      `- Amount: $500`,
      `- Eligibility: Students from ${city}, ${state}`,
      `- Deadline: [Date]`,
      `- Application URL: ${config.website}/scholarship`,
      ``,
      `Would you be able to add this to your listings?`,
      ``,
      `Thank you,`,
      `${businessName}`,
    ].join("\n");
  } else {
    body = [
      `${greeting},`,
      ``,
      `I'm reaching out from ${businessName}, a ${industry} business in ${city}, ${state}. We're looking to connect with local organizations and explore opportunities for collaboration or listing.`,
      ``,
      `We serve the ${city} community with ${config.categories.slice(0, 3).join(", ")} and would appreciate any opportunity to be featured or listed on your site.`,
      ``,
      `Best,`,
      `${businessName}`,
      `${config.website}`,
    ].join("\n");
  }

  // Tone
  let tone: "professional" | "friendly" | "casual";
  if (source.type.includes("testimonial") || source.type === "local_directory") {
    tone = "casual";
  } else if (source.type === "haro" || source.type === "government_resource") {
    tone = "professional";
  } else {
    tone = "friendly";
  }

  // Follow-up
  const followUpAction = source.type === "guest_post"
    ? "contribute a guest post"
    : source.type.includes("chamber")
    ? "join the chamber"
    : "connect";

  const followUpBody = [
    `Hi${contactName ? " " + contactName : ""},`,
    ``,
    `Just following up on my earlier message about ${businessName} and the opportunity to ${followUpAction}.`,
    ``,
    `I understand you're busy — just wanted to make sure my message didn't get buried. Happy to provide any additional info you need.`,
    ``,
    `Thanks!`,
    `${businessName}`,
  ].join("\n");

  return {
    subject,
    body,
    tone,
    personalization: ["businessName", "city", "state", "industry", "categories"],
    followUpSubject: `Following up — ${businessName} / ${city} ${industry}`,
    followUpBody,
  };
}

function calculatePriority(
  source: LinkSourceTemplate,
  config: LinkProspectConfig
): number {
  let score = 0;

  // DA is a strong signal
  score += Math.min(source.typicalDa, 50); // cap at 50

  // Difficulty bonus (easier = higher priority)
  if (source.difficulty === "easy") score += 30;
  else if (source.difficulty === "medium") score += 15;

  // Locality boost
  if (source.searchQuery.includes(config.city) || source.searchQuery.includes(config.state)) {
    score += 15;
  }

  // Industry relevance
  if (source.searchQuery.includes(config.industry) || source.angleTemplate.includes(config.industry)) {
    score += 10;
  }

  // Type-specific bonuses
  if (source.type === "chamber_of_commerce") score += 10;
  if (source.type === "local_university" || source.type === "government_resource") score += 15;
  if (source.type === "haro") score += 10;
  if (source.type === "testimonial") score += 5;

  return Math.min(score, 100);
}

/**
 * Generate local link opportunities based on business config
 */
export function generateLinkOpportunities(config: LinkProspectConfig): LinkOpportunity[] {
  const opportunities: LinkOpportunity[] = [];

  for (const source of LOCAL_LINK_SOURCES) {
    // Personalize the search query and angle
    const personalized = source.searchQuery
      .replace(/{city}/g, config.city)
      .replace(/{state}/g, config.state)
      .replace(/{industry}/g, config.industry);

    const personalizedAngle = source.angleTemplate
      .replace(/{city}/g, config.city)
      .replace(/{state}/g, config.state)
      .replace(/{industry}/g, config.industry)
      .replace(/{business}/g, config.businessName);

    const personalizedName = source.namePattern
      .replace(/{city}/g, config.city)
      .replace(/{state}/g, config.state)
      .replace(/{industry}/g, config.industry)
      .replace(/{topic}/g, config.industry)
      .replace(/{event}/g, "Community")
      .replace(/{vendor}/g, "Vendor");

    const priority = calculatePriority(source, config);
    const template = generateOutreachTemplate(source, config);

    // Calculate relevance and locality scores
    const relevance = Math.min(
      40 + (source.searchQuery.includes(config.industry) ? 30 : 0) + (source.type === "industry_association" ? 20 : 0) + (source.type === "resource_page" ? 15 : 0),
      100
    );

    const locality = Math.min(
      50 + (source.searchQuery.includes(config.city) ? 25 : 0) + (source.searchQuery.includes(config.state) ? 15 : 0) + (source.type === "chamber_of_commerce" ? 10 : 0),
      100
    );

    const estimatedTraffic = Math.round(source.typicalDa * 50 * (1 + locality / 200));

    const tags: string[] = [source.type, source.difficulty];
    if (locality >= 70) tags.push("hyperlocal");
    if (source.typicalDa >= 70) tags.push("high-da");
    if (source.difficulty === "easy") tags.push("quick-win");

    opportunities.push({
      id: `link-${slugify(source.type)}-${slugify(config.city)}`,
      type: source.type,
      websiteName: personalizedName,
      url: `https://www.google.com/search?q=${encodeURIComponent(personalized)}`,
      domain: slugify(personalizedName) + ".com",
      estimatedDa: source.typicalDa,
      relevance,
      locality,
      difficulty: source.difficulty,
      estimatedTraffic,
      contactMethod: source.contactMethod,
      contactInfo: null, // Will be filled by web research
      suggestedAngle: personalizedAngle,
      outreachTemplate: template,
      status: "new",
      priority,
      tags,
      notes: source.outreachContext,
    });
  }

  // Sort by priority
  return opportunities.sort((a, b) => b.priority - a.priority);
}

/**
 * Build the link authority summary
 */
export function buildLinkAuthoritySummary(
  opportunities: LinkOpportunity[]
): LinkAuthoritySummary {
  const byType: Record<string, number> = {};
  for (const opp of opportunities) {
    byType[opp.type] = (byType[opp.type] || 0) + 1;
  }

  const byDifficulty = {
    easy: opportunities.filter(o => o.difficulty === "easy").length,
    medium: opportunities.filter(o => o.difficulty === "medium").length,
    hard: opportunities.filter(o => o.difficulty === "hard").length,
  };

  return {
    totalOpportunities: opportunities.length,
    byType: byType as any,
    byDifficulty,
    avgDa: opportunities.length
      ? Math.round(opportunities.reduce((s, o) => s + o.estimatedDa, 0) / opportunities.length)
      : 0,
    avgRelevance: opportunities.length
      ? Math.round(opportunities.reduce((s, o) => s + o.relevance, 0) / opportunities.length)
      : 0,
    avgLocality: opportunities.length
      ? Math.round(opportunities.reduce((s, o) => s + o.locality, 0) / opportunities.length)
      : 0,
    topOpportunities: opportunities.slice(0, 10),
  };
}

/**
 * Use AI to enrich opportunities with real contact info
 * (Called separately after initial generation for rate-limiting)
 */
export async function enrichOpportunitiesWithAI(
  opportunities: LinkOpportunity[],
  config: LinkProspectConfig
): Promise<LinkOpportunity[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return opportunities;

  // Batch the top 5 opportunities for AI enrichment
  const top5 = opportunities.slice(0, 5);

  const prompt = `For a ${config.industry} business "${config.businessName}" in ${config.city}, ${config.state}, find contact information for these local link opportunities:

${top5.map((o, i) => `${i + 1}. ${o.websiteName} (${o.type}) - ${o.suggestedAngle}`).join("\n")}

For each, provide:
- The most likely website URL
- Contact email or contact page URL
- The best person to contact (name/title if known)

Respond in JSON format as an array of objects with: index, url, contactInfo, contactName fields.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a local SEO link building expert. Provide accurate, actionable contact information for local link opportunities. Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20000),
    });

    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);

    if (parsed.opportunities && Array.isArray(parsed.opportunities)) {
      for (const item of parsed.opportunities) {
        const idx = (item.index ?? 0) - 1;
        if (idx >= 0 && idx < top5.length) {
          if (item.url) top5[idx].url = item.url;
          if (item.contactInfo) top5[idx].contactInfo = item.contactInfo;
          if (item.contactName) {
            // Regenerate template with contact name
            const source = LOCAL_LINK_SOURCES.find(s => s.type === top5[idx].type);
            if (source) {
              top5[idx].outreachTemplate = generateOutreachTemplate(source, config, item.contactName);
            }
          }
        }
      }
    }
  } catch {
    // AI enrichment is optional — return as-is
  }

  return opportunities;
}
