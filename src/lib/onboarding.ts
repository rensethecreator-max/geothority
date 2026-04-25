export const ONBOARDING_COMPLETE_STORAGE_KEY = "geo-onboarding-done";
export const ONBOARDING_STEPS_STORAGE_KEY = "geothority_onboarding_completed_steps";

export function readOnboardingCompletion(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (localStorage.getItem(ONBOARDING_COMPLETE_STORAGE_KEY) === "1") {
      return true;
    }

    const rawSteps = localStorage.getItem(ONBOARDING_STEPS_STORAGE_KEY);
    if (!rawSteps) return false;

    const parsed = JSON.parse(rawSteps);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function markOnboardingComplete(completedStepIds?: string[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "1");
    if (completedStepIds && completedStepIds.length > 0) {
      localStorage.setItem(ONBOARDING_STEPS_STORAGE_KEY, JSON.stringify(completedStepIds));
    }
  } catch {
    // ignore storage failures
  }
}
