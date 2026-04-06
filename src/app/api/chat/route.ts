import { NextRequest, NextResponse } from "next/server";
import { openai, WILL_SYSTEM_PROMPT } from "@/lib/openai";
import { chatRatelimit, checkRateLimit } from "@/lib/ratelimit";
import { createServerSupabase } from "@/lib/supabase/server";

// Prompt injection patterns to block
const INJECTION_PATTERNS = [
  /ignore (all |previous |above |prior )?(instructions|prompts|system|rules)/i,
  /you are now/i,
  /new (persona|role|instructions|system prompt)/i,
  /disregard (all |previous )?instructions/i,
  /\[system\]/i,
  /act as (a |an )?(?!geothority|will|assistant)/i,
  /pretend (you are|to be)/i,
  /jailbreak/i,
  /DAN mode/i,
];

function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

const MAX_MESSAGE_LENGTH = 1000;
const MAX_MESSAGES = 20;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Auth check + rate limit
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const identifier = user?.id || (req.headers.get('x-forwarded-for') || 'anon');
    const rl = await checkRateLimit(chatRatelimit, `chat:${identifier}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many messages. Please wait before sending more." }, { status: 429 });
    }

    // Sanitize: limit history, length, and check for prompt injection
    const recentMessages = messages
      .slice(-MAX_MESSAGES)
      .filter((m: any) => typeof m.content === 'string' && m.content.length <= MAX_MESSAGE_LENGTH)
      .map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content.slice(0, MAX_MESSAGE_LENGTH),
      }));

    // Block prompt injection attempts
    const lastUserMsg = recentMessages.filter((m: any) => m.role === 'user').pop();
    if (lastUserMsg && containsInjection(lastUserMsg.content)) {
      return NextResponse.json({
        message: "I can only help with Geothority and local SEO topics. What can I help you with?"
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: WILL_SYSTEM_PROMPT },
        ...recentMessages,
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const message = completion.choices[0]?.message?.content || "I'm having trouble responding. Please try again.";

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
