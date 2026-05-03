export function normalizeReputationBusinessName(businessName: string) {
  return businessName.replace(/\s+/g, " ").trim();
}

export function normalizeReputationBusinessKey(businessName: string) {
  const normalizedName = normalizeReputationBusinessName(businessName)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const collapsed = normalizedName
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return collapsed || "business";
}

export function getReputationBusinessIdentity(businessName: string) {
  const displayName = normalizeReputationBusinessName(businessName);

  return {
    displayName,
    businessKey: normalizeReputationBusinessKey(displayName),
  };
}
