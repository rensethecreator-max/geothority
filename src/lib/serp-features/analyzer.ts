// SERP Feature Detection & Opportunity Analyzer

import {
  SerpFeatureType,
  DetectedFeature,
  SerpOpportunity,
  SerpAnalysisResult,
  SnippetFormat,
  Competitiveness,
  SerpStrategy,
  ContentRecommendation,
  GbpDataPoint,
} from './types';

// Feature-to-strategy mapping: what to do when a feature is detected
const FEATURE_STRATEGIES: Record<SerpFeatureType, {
  interpretPresence: string;
  defaultSnippetFormat: SnippetFormat;
  gbpFocus: string[];
}> = {
  local_pack: {
    interpretPresence: 'Local Pack shows — proximity, relevance, and prominence matter. GBP completeness and reviews are the primary levers.',
    defaultSnippetFormat: 'paragraph',
    gbpFocus: ['categories', 'description', 'photos', 'reviews', 'posts', 'Q&A'],
  },
  featured_snippet: {
    interpretPresence: 'Featured Snippet shows — Google wants a direct answer. Content structure and formatting are the primary levers.',
    defaultSnippetFormat: 'paragraph',
    gbpFocus: ['description'],
  },
  knowledge_panel: {
    interpretPresence: 'Knowledge Panel shows — entity authority and structured data are primary levers.',
    defaultSnippetFormat: 'paragraph',
    gbpFocus: ['description', 'categories'],
  },
  people_also_ask: {
    interpretPresence: 'PAA shows — informational intent is strong. FAQ-style content with clear Q&A formatting wins.',
    defaultSnippetFormat: 'paragraph',
    gbpFocus: ['Q&A'],
  },
  image_pack: {
    interpretPresence: 'Image Pack shows — visual content with proper alt text and schema wins.',
    defaultSnippetFormat: 'bulleted_list',
    gbpFocus: ['photos'],
  },
  video_carousel: {
    interpretPresence: 'Video Carousel shows — video content with structured markup wins.',
    defaultSnippetFormat: 'numbered_list',
    gbpFocus: ['posts'],
  },
};

export function analyzeSerpFeatures(params: {
  keyword: string;
  location: string;
  detectedFeatures: DetectedFeature[];
  currentRanking?: number;
  competitorHoldingSnippet?: string;
  businessGbpCompleteness?: number;
}): SerpAnalysisResult {
  const { keyword, location, detectedFeatures, currentRanking, competitorHoldingSnippet, businessGbpCompleteness = 50 } = params;

  const opportunities: SerpOpportunity[] = [];

  for (const feature of detectedFeatures) {
    if (!feature.present) continue;

    const strategyConfig = FEATURE_STRATEGIES[feature.type];
    const competitiveness = assessCompetitiveness(feature, currentRanking);
    const difficulty = calculateDifficulty(feature, competitiveness, currentRanking);
    const estimatedImpact = calculateImpact(feature.type, competitiveness);

    const strategies = generateStrategies(feature, competitiveness, businessGbpCompleteness);
    const contentRecs = generateContentRecommendations(feature, keyword, strategyConfig.defaultSnippetFormat);
    const gbpRecs = generateGbpRecommendations(feature, strategyConfig.gbpFocus, businessGbpCompleteness);

    opportunities.push({
      keyword,
      featureType: feature.type,
      competitiveness,
      difficulty,
      estimatedImpact,
      strategy: strategies[0], // Primary strategy
      contentRecommendations: contentRecs,
      gbpDataPoints: gbpRecs,
      priority: Math.round(estimatedImpact * (1 - difficulty / 200)), // Higher impact, lower difficulty = higher priority
    });
  }

  // Sort by priority descending
  opportunities.sort((a, b) => b.priority - a.priority);

  return {
    keyword,
    location,
    analyzedAt: new Date().toISOString(),
    features: detectedFeatures,
    opportunities,
  };
}

function assessCompetitiveness(feature: DetectedFeature, currentRanking?: number): Competitiveness {
  if (feature.type === 'local_pack') {
    // Local pack is highly competitive by nature
    if (currentRanking && currentRanking <= 3) return 'low';
    if (currentRanking && currentRanking <= 10) return 'medium';
    return 'high';
  }
  if (feature.type === 'featured_snippet') {
    // If current holder is a high-DR site, more competitive
    if (feature.currentHolderUrl && isHighAuthorityDomain(feature.currentHolderUrl)) return 'high';
    return 'medium';
  }
  return 'medium';
}

function calculateDifficulty(feature: DetectedFeature, competitiveness: Competitiveness, currentRanking?: number): number {
  let base = competitiveness === 'high' ? 75 : competitiveness === 'medium' ? 50 : 25;
  if (currentRanking) {
    if (currentRanking <= 10) base -= 15;
    if (currentRanking <= 5) base -= 10;
    if (currentRanking >= 20) base += 10;
  }
  return Math.max(10, Math.min(95, base));
}

function calculateImpact(featureType: SerpFeatureType, competitiveness: Competitiveness): number {
  const impactMap: Record<SerpFeatureType, number> = {
    local_pack: 90,
    featured_snippet: 75,
    knowledge_panel: 60,
    people_also_ask: 55,
    image_pack: 40,
    video_carousel: 45,
  };
  let impact = impactMap[featureType];
  if (competitiveness === 'low') impact += 10;
  if (competitiveness === 'high') impact -= 15;
  return Math.max(20, Math.min(100, impact));
}

function generateStrategies(feature: DetectedFeature, competitiveness: Competitiveness, gbpCompleteness: number): SerpStrategy[] {
  const strategies: SerpStrategy[] = [];

  if (feature.type === 'local_pack') {
    strategies.push({
      type: 'gbp_optimization',
      title: 'Dominate Local Pack via GBP Completeness',
      description: 'Local Pack ranking is driven by proximity, relevance, and prominence. GBP completeness is the most controllable lever.',
      actions: [
        'Ensure primary category is the most specific match for the target keyword',
        'Add all relevant secondary categories (up to 10)',
        'Write a keyword-rich 750-character business description',
        'Upload 20+ high-quality photos with geo-tagged EXIF data',
        'Publish weekly GBP posts with keyword-targeted content',
        'Implement a systematic review acquisition program (5+ per month)',
        'Respond to all reviews within 24 hours with keyword-rich responses',
        'Add all services with descriptions that include target keywords',
        'Complete all GBP attributes (wheelchair accessible, etc.)',
        'Add Q&A entries that address target keyword queries',
      ],
      estimatedEffort: competitiveness === 'high' ? 'high' : 'medium',
    });

    if (gbpCompleteness < 80) {
      strategies.push({
        type: 'citation_improvement',
        title: 'Close GBP Completeness Gaps',
        description: `GBP is only ${gbpCompleteness}% complete. Every missing field is a ranking signal lost.`,
        actions: [
          'Audit all GBP fields and fill every missing entry',
          'Add business hours for all service-specific periods',
          'Add service area boundaries precisely',
          'Ensure NAP consistency across all citations',
        ],
        estimatedEffort: 'low',
      });
    }
  }

  if (feature.type === 'featured_snippet') {
    const format = feature.snippetFormat || 'paragraph';
    strategies.push({
      type: 'content_structure',
      title: `Win Featured Snippet with ${format === 'paragraph' ? 'Direct Answer' : format === 'table' ? 'Comparison Table' : 'Structured List'} Format`,
      description: `Google is showing a ${format} snippet. Match the format exactly with a clear, direct answer placed early in your content.`,
      actions: [
        `Add an H2 heading that directly mirrors the search query: "${feature.snippetContent ? extractQueryFromSnippet(feature.snippetContent) : 'the target keyword as a question'}"`,
        `Place a concise, direct answer (${format === 'paragraph' ? '40-60 words' : format === 'table' ? '3-5 row comparison' : '5-8 items'}) immediately after the H2`,
        'Use schema markup (FAQ, HowTo, or Article) that matches the snippet format',
        'Ensure the answer paragraph or list appears above the fold',
        'Remove any competing answers on the same page — there should be one canonical answer per H2',
        'Add supporting detail after the direct answer to demonstrate depth',
      ],
      estimatedEffort: competitiveness === 'high' ? 'high' : 'medium',
    });
  }

  if (feature.type === 'people_also_ask') {
    strategies.push({
      type: 'content_structure',
      title: 'Capture PAA with FAQ Content Hub',
      description: 'PAA boxes mean Google wants clear Q&A content. Create a comprehensive FAQ section that answers related questions.',
      actions: [
        'Create an FAQ page or section with 10-15 questions from PAA research',
        'Format each Q&A with Question as H3 and Answer as concise paragraph (40-60 words)',
        'Add FAQ schema markup for all question-answer pairs',
        'Link between related Q&A answers for topical depth',
        'Update Q&A quarterly based on new PAA queries',
      ],
      estimatedEffort: 'medium',
    });
  }

  // Default fallback
  if (strategies.length === 0) {
    strategies.push({
      type: 'content_structure',
      title: `Optimize for ${feature.type.replace('_', ' ')} SERP Feature`,
      description: 'Create targeted, well-structured content designed to capture this SERP feature.',
      actions: [
        'Analyze current holder\'s content structure and format',
        'Create better-structured content matching the detected format',
        'Add appropriate schema markup',
        'Ensure content directly answers the implied query',
      ],
      estimatedEffort: 'medium',
    });
  }

  return strategies;
}

function generateContentRecommendations(feature: DetectedFeature, keyword: string, defaultFormat: SnippetFormat): ContentRecommendation[] {
  const recs: ContentRecommendation[] = [];

  if (feature.type === 'featured_snippet' || feature.type === 'people_also_ask') {
    recs.push({
      format: feature.snippetFormat || defaultFormat,
      heading: `${keyword} — Direct Answer`,
      suggestedContent: feature.snippetFormat === 'table'
        ? `Create a comparison table with headers: Feature | Option A | Option B. 3-5 rows max.`
        : feature.snippetFormat === 'bulleted_list'
        ? `Provide 5-7 concise bullet points that directly answer the query. Each bullet: 10-15 words.`
        : feature.snippetFormat === 'numbered_list'
        ? `Provide 5-8 numbered steps/items. Each step: imperative verb + brief description.`
        : `Write a single paragraph of 40-60 words that directly answers the query. Place it immediately after the H2. One clear sentence first, then supporting detail.`,
      targetWordCount: feature.type === 'people_also_ask' ? 300 : 1500,
      schemaMarkup: feature.type === 'people_also_ask' ? 'FAQPage' : 'Article',
      placementAdvice: 'Place the direct answer immediately after the H2 heading, before any other content. The first 40-60 words are the snippet candidate.',
    });
  }

  if (feature.type === 'local_pack') {
    recs.push({
      format: 'paragraph',
      heading: `${keyword} in [City] — Local Service Page`,
      suggestedContent: `Create a location-specific service page with: (1) NAP in schema, (2) embedded Google Map, (3) local testimonials, (4) service area description, (5) neighborhood/landmark references for proximity signals.`,
      targetWordCount: 1200,
      schemaMarkup: 'LocalBusiness',
      placementAdvice: 'Link from homepage nav and GBP website field. Include city/neighborhood in H1 and URL slug.',
    });
  }

  return recs;
}

function generateGbpRecommendations(feature: DetectedFeature, focusAreas: string[], gbpCompleteness: number): GbpDataPoint[] {
  const recs: GbpDataPoint[] = [];

  if (focusAreas.includes('categories') && gbpCompleteness < 90) {
    recs.push({
      field: 'Primary Category',
      currentValue: undefined,
      recommendedValue: 'Most specific category matching target keyword',
      reason: 'Primary category is the #1 relevance signal for Local Pack ranking',
      priority: 'critical',
    });
    recs.push({
      field: 'Secondary Categories',
      currentValue: undefined,
      recommendedValue: 'Add 5-10 relevant secondary categories',
      reason: 'Secondary categories expand relevance surface area for related queries',
      priority: 'important',
    });
  }

  if (focusAreas.includes('description')) {
    recs.push({
      field: 'Business Description',
      currentValue: undefined,
      recommendedValue: 'Keyword-rich 750-character description with primary keyword in first 100 chars',
      reason: 'GBP description contributes to relevance scoring; first 100 chars visible in Knowledge Panel',
      priority: 'important',
    });
  }

  if (focusAreas.includes('reviews')) {
    recs.push({
      field: 'Review Velocity',
      currentValue: undefined,
      recommendedValue: '5+ new reviews per month with keyword mentions',
      reason: 'Review recency and velocity are top prominence signals; keyword mentions in reviews boost relevance',
      priority: 'critical',
    });
  }

  if (focusAreas.includes('photos')) {
    recs.push({
      field: 'Photo Count & Freshness',
      currentValue: undefined,
      recommendedValue: '20+ photos total, add 2-3 new photos monthly',
      reason: 'Businesses with 100+ photos get 520% more calls than average; freshness signals active management',
      priority: 'important',
    });
  }

  if (focusAreas.includes('posts')) {
    recs.push({
      field: 'GBP Post Cadence',
      currentValue: undefined,
      recommendedValue: 'Weekly posts with keyword-targeted content and CTAs',
      reason: 'Active posting signals business activity and provides keyword injection opportunities',
      priority: 'important',
    });
  }

  if (focusAreas.includes('Q&A')) {
    recs.push({
      field: 'Q&A Section',
      currentValue: undefined,
      recommendedValue: 'Pre-populate 5-10 Q&As that address target keyword queries',
      reason: 'Q&A provides keyword-rich content and prevents misinformation from public answers',
      priority: 'nice_to_have',
    });
  }

  return recs;
}

function isHighAuthorityDomain(url: string): boolean {
  const highDrDomains = ['wikipedia.org', 'webmd.com', 'mayoclinic.org', 'investopedia.com', 'forbes.com', 'nytimes.com', '.gov', '.edu'];
  return highDrDomains.some(d => url.includes(d));
}

function extractQueryFromSnippet(snippet: string): string {
  // Best effort: take first ~8 words and turn into question-like heading
  const words = snippet.split(' ').slice(0, 8).join(' ');
  return words.length > 10 ? `${words}...` : words;
}

// Full report generator
export function generateSerpFeatureReport(params: {
  businessName: string;
  location: string;
  keywords: string[];
  serpResults: SerpAnalysisResult[];
  gbpCompleteness: number;
}): import('./types').SerpFeatureReport {
  const { businessName, location, keywords, serpResults, gbpCompleteness } = params;

  const allOpportunities = serpResults.flatMap(r => r.opportunities);
  const quickWins = allOpportunities.filter(o => o.difficulty < 40 && o.estimatedImpact > 40).sort((a, b) => b.priority - a.priority).slice(0, 5);
  const longTermPlays = allOpportunities.filter(o => o.difficulty >= 60).sort((a, b) => b.estimatedImpact - a.estimatedImpact).slice(0, 5);

  const contentPieces = generateContentPieces(serpResults, businessName, location);

  const localPackOpps = allOpportunities.filter(o => o.featureType === 'local_pack');
  const snippetOpps = allOpportunities.filter(o => o.featureType === 'featured_snippet');

  const localPackReadiness = Math.min(100, Math.round(
    (gbpCompleteness * 0.4) + (localPackOpps.length > 0 ? 30 : 10) + (gbpCompleteness > 80 ? 20 : 0) + (localPackOpps.some(o => o.competitiveness === 'low') ? 10 : 0)
  ));

  const snippetReadiness = Math.min(100, Math.round(
    (snippetOpps.length > 0 ? 30 : 5) + (snippetOpps.some(o => o.difficulty < 50) ? 30 : 10) + 20 + (contentPieces.length > 0 ? 20 : 0)
  ));

  return {
    businessName,
    location,
    generatedAt: new Date().toISOString(),
    overallScore: Math.round((localPackReadiness + snippetReadiness) / 2),
    localPackReadiness,
    snippetReadiness,
    opportunities: allOpportunities,
    quickWins,
    longTermPlays,
    contentPieces,
  };
}

function generateContentPieces(results: SerpAnalysisResult[], businessName: string, location: string): import('./types').ContentPiece[] {
  const pieces: import('./types').ContentPiece[] = [];
  let id = 1;

  for (const result of results) {
    for (const opp of result.opportunities) {
      // Only generate content pieces for the highest-impact opportunities
      if (opp.estimatedImpact < 50) continue;

      const rec = opp.contentRecommendations[0];
      if (!rec) continue;

      pieces.push({
        id: `sp-${id++}`,
        title: `${result.keyword} — ${opp.featureType === 'local_pack' ? 'Local Service Page' : opp.featureType === 'featured_snippet' ? 'Snippet-Optimized Article' : 'FAQ Content'}`,
        targetKeyword: result.keyword,
        targetFeature: opp.featureType,
        format: rec.format,
        outline: generateOutline(result.keyword, opp.featureType, rec.format, location),
        snippetOptimizedSection: rec.suggestedContent,
        schemaMarkup: rec.schemaMarkup,
        gbpActions: opp.gbpDataPoints.map(g => `${g.field}: ${g.recommendedValue}`),
        estimatedTrafficLift: opp.estimatedImpact,
      });
    }
  }

  return pieces.slice(0, 10); // Cap at 10
}

function generateOutline(keyword: string, feature: SerpFeatureType, format: SnippetFormat, location: string): string[] {
  if (feature === 'local_pack') {
    return [
      `H1: Best ${keyword} in ${location}`,
      `H2: Why Choose [Business] for ${keyword}`,
      `H2: Our ${keyword} Services`,
      `H2: ${location} Service Area`,
      `H2: What Our Clients Say`,
      `H2: Frequently Asked Questions About ${keyword}`,
      `H2: Contact Us for ${keyword} in ${location}`,
    ];
  }
  if (feature === 'featured_snippet') {
    return [
      `H1: ${keyword}: Complete Guide`,
      `H2: What Is ${keyword}? [SNIPPET TARGET: 40-60 word direct answer]`,
      `H2: How ${keyword} Works`,
      `H2: ${keyword} Benefits`,
      `H2: ${keyword} vs Alternatives`,
      `H2: Frequently Asked Questions`,
    ];
  }
  return [
    `H1: ${keyword} — Your Questions Answered`,
    `H2: Top Questions About ${keyword}`,
    `H3: What is ${keyword}? [SNIPPET TARGET]`,
    `H3: How much does ${keyword} cost? [SNIPPET TARGET]`,
    `H3: Is ${keyword} worth it? [SNIPPET TARGET]`,
    `H2: Learn More About ${keyword}`,
  ];
}
