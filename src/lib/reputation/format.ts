export function formatTriggerSource(triggerSource: string | null | undefined) {
  if (!triggerSource) return "Manual";
  return triggerSource
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
