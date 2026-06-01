import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";

export function isMissingOnboardingColumnError(error?: Pick<PostgrestError, "message" | "code"> | null) {
  const message = error?.message;

  return (
    typeof message === "string"
    && (
      /user_profiles\.onboarding_completed.*does not exist/i.test(message)
      || /Could not find the 'onboarding_completed' column of 'user_profiles' in the schema cache/i.test(message)
    )
  );
}

export async function ensureUserProfileExists(
  supabase: SupabaseClient,
  user: User
) {
  const existingProfileResult = await supabase
    .from("user_profiles")
    .select("id, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfileResult.error && existingProfileResult.data) {
    return {
      error: null,
      usedFallback: false,
      created: false,
      onboardingCompleted: existingProfileResult.data.onboarding_completed === true,
    };
  }

  if (existingProfileResult.error && !isMissingOnboardingColumnError(existingProfileResult.error)) {
    return {
      error: existingProfileResult.error,
      usedFallback: false,
      created: false,
      onboardingCompleted: false,
    };
  }

  const profileSeed = {
    id: user.id,
    onboarding_completed: false,
  };

  const { error } = await supabase.from("user_profiles").upsert(profileSeed, {
    onConflict: "id",
    ignoreDuplicates: true,
  });

  if (!isMissingOnboardingColumnError(error)) {
    return { error, usedFallback: false, created: !error, onboardingCompleted: false };
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
    created: !fallback.error,
    onboardingCompleted: false,
    drift: "missing_onboarding_completed_column",
  };
}
