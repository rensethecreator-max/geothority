import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  const configuredCode = process.env.GEOTHORITY_BETA_SIGNUP_CODE?.trim();

  if (!configuredCode) {
    return NextResponse.json({ error: "Beta signup is not enabled." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const betaCode = typeof body.betaCode === "string" ? body.betaCode.trim() : "";

  if (betaCode !== configuredCode) {
    return NextResponse.json({ error: "Invalid beta access code." }, { status: 403 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      signup_source: "controlled_beta",
    },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "An account already exists for this email."
      : "Unable to create beta account. Please contact support.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
