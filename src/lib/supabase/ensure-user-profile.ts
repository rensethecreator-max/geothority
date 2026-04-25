import type { SupabaseClient, User } from "@supabase/supabase-js";

function isMissingOnboardingColumn(message?: string | null) {
  return typeof message === "string" && /user_profiles\.onboarding_completed.*does not exist/i.test(message);
}

export async function ensureUserProfileExists(
  supabase: SupabaseClient,
  user: User
) {
  const profileSeed = {
    id: user.id,
    onboarding_completed: false,
  };

  const { error } = await supabase.from("user_profiles").upsert(profileSeed, {
    onConflict: "id",
    ignoreDuplicates: true,
  });

  if (!isMissingOnboardingColumn(error?.message)) {
    return { error, usedFallback: false };
  }

  console.warn(
    "user_profiles.onboarding_completed is missing in the live schema; falling back to minimal profile seed",
    { userId: user.id }
  );

  const fallback = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
    },
    {
      onConflict: "id",
      ignoreDuplicates: true,
    }
  );

  return {
    error: fallback.error,
    usedFallback: true,
    drift: "missing_onboarding_completed_column",
  };
}
