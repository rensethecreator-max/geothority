import { NextRequest, NextResponse } from "next/server";
import { createOptionalServiceClient } from "@/lib/supabase/server";
import { ensureUserProfileExists } from "@/lib/supabase/ensure-user-profile";

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

  const supabase = createOptionalServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      signup_source: "controlled_beta",
    },
  });

  if (error || !data.user) {
    const message = error?.message.toLowerCase().includes("already")
      ? "An account already exists for this email."
      : "Unable to create beta account. Please contact support.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  const profileSeed = await ensureUserProfileExists(supabase, data.user);
  if (profileSeed.error) {
    console.error("Failed to prepare beta account profile:", profileSeed.error);
    return NextResponse.json({ error: "Your account was created, but profile setup could not be completed. Sign in to finish setup." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
