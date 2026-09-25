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

  const usedFallback = isMissingOnboardingColumnError(existingProfileResult.error);
  const profileSeed = usedFallback
    ? { id: user.id }
    : { id: user.id, onboarding_completed: false };

  // Concurrent signup/callback requests must never reset an existing account's
  // onboarding state, billing plan, or other profile fields.
  const insertion = await supabase.from("user_profiles").upsert(profileSeed, {
    onConflict: "id",
    ignoreDuplicates: true,
  }).select("id").maybeSingle();

  if (insertion.error) {
    return { error: insertion.error, usedFallback, created: false, onboardingCompleted: false };
  }

  const confirmation = usedFallback
    ? await supabase.from("user_profiles").select("id").eq("id", user.id).maybeSingle()
    : await supabase.from("user_profiles").select("id, onboarding_completed").eq("id", user.id).maybeSingle();

  if (confirmation.error || !confirmation.data) {
    return {
      error: confirmation.error ?? { code: "PROFILE_NOT_SAVED", message: "User profile could not be created or verified." },
      usedFallback,
      created: false,
      onboardingCompleted: false,
    };
  }

  return {
    error: null,
    usedFallback,
    created: Boolean(insertion.data),
    onboardingCompleted: "onboarding_completed" in confirmation.data && confirmation.data.onboarding_completed === true,
  };
}
