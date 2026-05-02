import { NextRequest, NextResponse } from "next/server";
import { sendReputationRequestNow } from "@/lib/reputation/request-service";

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    if (!requestId) {
      return NextResponse.json({ error: "requestId required" }, { status: 400 });
    }

    const result = await sendReputationRequestNow(requestId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
