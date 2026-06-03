import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { ACTIVE_LLM_PROVIDER, DEFAULT_LLM_MODEL } from "@/lib/openai";

const EMAIL_SUPPORT_FALLBACK_ID = "email-support";

function fallbackMessages() {
  return NextResponse.json([
    {
      id: "email-support-message",
      conversation_id: EMAIL_SUPPORT_FALLBACK_ID,
      role: "assistant",
      content: "Support chat is being configured for beta. Please email hello@geothority.io and we will help you directly.",
      created_at: new Date().toISOString(),
    },
  ]);
}

async function getAIReply(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENROUTER_API_KEY
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1";

  if (!apiKey) {
    return "I'm here to help with your local SEO questions! However, I'm not fully configured yet. Please contact support.";
  }

  const systemPrompt = `You are a helpful AI support assistant for Geothority, the local SEO platform for insurance agents and local businesses.

You help users with:
- Understanding their Trust Stack™ score and how to improve it
- Running local SEO audits and interpreting results
- Google Business Profile optimization
- Competitor monitoring and gap analysis
- Content generation for local SEO
- Subscription and billing questions
- General platform navigation

Be concise, friendly, and helpful. Focus on local SEO best practices for insurance agents.`;

  try {
    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(ACTIVE_LLM_PROVIDER === "openrouter"
          ? {
              "HTTP-Referer": "https://www.geothority.io",
              "X-Title": "Geothority",
            }
          : {}),
      },
      body: JSON.stringify({
        model: DEFAULT_LLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10),
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      console.error("AI API error:", resp.status);
      return "I'm having trouble right now. Please try again shortly.";
    }

    const data = await resp.json() as any;
    return data.choices?.[0]?.message?.content ?? "No response generated.";
  } catch (err) {
    console.error("AI fetch error:", err);
    return "An error occurred. Please try again.";
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const convId = params.id;
  if (convId === EMAIL_SUPPORT_FALLBACK_ID) {
    return fallbackMessages();
  }

  const supabase = createServiceClient();

  // Verify ownership
  const { data: conv } = await supabase
    .from("support_conversations")
    .select("id")
    .eq("id", convId)
    .eq("user_id", user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  return NextResponse.json(messages ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const convId = params.id;
  if (convId === EMAIL_SUPPORT_FALLBACK_ID) {
    return NextResponse.json(
      {
        id: "email-support-reply",
        conversation_id: EMAIL_SUPPORT_FALLBACK_ID,
        role: "assistant",
        content: "Please email hello@geothority.io for beta support. Your message was not stored in chat because persistent chat setup is still being configured.",
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }

  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify ownership
  const { data: conv } = await supabase
    .from("support_conversations")
    .select("id")
    .eq("id", convId)
    .eq("user_id", user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Save user message
  await supabase.from("support_messages").insert({
    conversation_id: convId,
    role: "user",
    content: content.trim(),
  });

  // Fetch history for AI context
  const { data: history } = await supabase
    .from("support_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(20);

  // Generate AI reply
  const aiContent = await getAIReply(
    (history ?? []) as Array<{ role: string; content: string }>
  );

  // Save assistant message
  const { data: saved, error } = await supabase
    .from("support_messages")
    .insert({
      conversation_id: convId,
      role: "assistant",
      content: aiContent,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json(saved, { status: 201 });
}
