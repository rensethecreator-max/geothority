/**
 * DELETE /api/user/account
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires the user to pass their email as confirmation.
 *
 * Body: { confirmEmail: string }
 *
 * Uses the Supabase Admin API (service role) to delete the user from auth.users,
 * which cascades to all user_profiles FK tables via ON DELETE CASCADE.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  try {
    // 1. Authenticate the caller
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Require email confirmation in the body to prevent accidental deletion
    const body = await req.json().catch(() => ({}));
    const { confirmEmail } = body as { confirmEmail?: string };

    if (!confirmEmail || confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "Email confirmation does not match. Please enter your email address to confirm account deletion." },
        { status: 400 }
      );
    }

    // 3. Use service client (admin) to delete the user — cascades to all FK tables
    const serviceClient = createServiceClient();
    const { error } = await serviceClient.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("[account-delete] Supabase admin delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete account. Please contact hello@geothority.io." },
        { status: 500 }
      );
    }

    // 4. Sign the user out of their current session
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true, message: "Account deleted successfully." });
  } catch (err) {
    console.error("[account-delete] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
