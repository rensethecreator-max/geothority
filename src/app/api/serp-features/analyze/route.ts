import { NextRequest, NextResponse } from 'next/server';
import { analyzeSerpFeatures, generateSerpFeatureReport } from '@/lib/serp-features';
import type { DetectedFeature } from '@/lib/serp-features';

// Default SERP feature detection based on keyword analysis
// In production, this would call a real SERP API (e.g., Serper.dev, DataForSEO)
function detectFeaturesForKeyword(keyword: string, location: string): DetectedFeature[] {
  const kw = keyword.toLowerCase();
  const features: DetectedFeature[] = [];

  // Local-intent keywords trigger Local Pack
  const localTriggers = ['near me', 'nearby', 'in ', 'local', 'close to', ' closest', 'best ', 'top ', 'cheap ', 'affordable '];
  const isLocalIntent = localTriggers.some(t => kw.includes(t)) || kw.length < 30;

  if (isLocalIntent) {
    features.push({
      type: 'local_pack',
      present: true,
      position: 1,
    });
  }

  // Question-like keywords trigger Featured Snippet + PAA
  const questionTriggers = ['what is', 'how to', 'how much', 'how do', 'why ', 'when ', 'where ', 'can you', 'do i need'];
  const isQuestionIntent = questionTriggers.some(t => kw.includes(t));

  if (isQuestionIntent || kw.includes(' vs ') || kw.includes(' vs. ')) {
    features.push({
      type: 'featured_snippet',
      present: true,
      snippetFormat: kw.includes(' vs ') ? 'table' : kw.includes('how to') ? 'numbered_list' : 'paragraph',
    });
  }

  // PAA almost always shows for informational queries
  if (isQuestionIntent || isLocalIntent) {
    features.push({
      type: 'people_also_ask',
      present: true,
    });
  }

  // Service/business keywords get knowledge panel
  if (isLocalIntent && !isQuestionIntent) {
    features.push({
      type: 'knowledge_panel',
      present: true,
    });
  }

  return features;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, location, gbpCompleteness = 50, currentRanking } = body;

    if (!keyword || !location) {
      return NextResponse.json({ error: 'keyword and location are required' }, { status: 400 });
    }

    // Detect SERP features (placeholder — production would use real SERP API)
    const detectedFeatures = detectFeaturesForKeyword(keyword, location);

    // Analyze opportunities
    const analysis = analyzeSerpFeatures({
      keyword,
      location,
      detectedFeatures,
      currentRanking,
      businessGbpCompleteness: gbpCompleteness,
    });

    // Generate full report
    const report = generateSerpFeatureReport({
      businessName: 'Your Business', // Would come from user context
      location,
      keywords: [keyword],
      serpResults: [analysis],
      gbpCompleteness,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('SERP features analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
