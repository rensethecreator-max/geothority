import { NextRequest, NextResponse } from "next/server";
import { openai, WILL_SYSTEM_PROMPT } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Limit conversation history to last 10 messages
    const recentMessages = messages.slice(-10);

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
