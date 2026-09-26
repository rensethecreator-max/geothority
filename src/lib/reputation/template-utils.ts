import {
  DEFAULT_REPUTATION_TEMPLATES,
  fillReputationTemplate,
  type ReputationTemplate,
  type ReputationTemplateCategory,
} from "@/lib/reputation/defaults";

export function generateReputationTemplates(
  businessName: string,
  customTemplates?: Array<{
    id: string;
    category: ReputationTemplateCategory;
    categoryLabel?: string;
    icon?: string;
    templateText: string;
    usageCount?: number;
  }>,
): Array<ReputationTemplate & { filledText: string }> {
  const defaults = DEFAULT_REPUTATION_TEMPLATES.map((template) => ({
    ...template,
    filledText: fillReputationTemplate(template.templateText, businessName),
  }));

  if (!customTemplates?.length) {
    return defaults;
  }

  const customByCategory = new Map(customTemplates.map((template) => [template.category, template]));
  const merged = defaults.map((template) => {
    const custom = customByCategory.get(template.category);
    if (!custom) return template;

    return {
      ...template,
      id: custom.id,
      categoryLabel: custom.categoryLabel ?? template.categoryLabel,
      icon: custom.icon ?? template.icon,
      templateText: custom.templateText,
      usageCount: custom.usageCount ?? template.usageCount,
      isDefault: false,
      filledText: fillReputationTemplate(custom.templateText, businessName),
    };
  });

  const defaultCategories = new Set(DEFAULT_REPUTATION_TEMPLATES.map((template) => template.category));
  for (const custom of customTemplates) {
    if (defaultCategories.has(custom.category)) continue;
    merged.push({
      id: custom.id,
      category: custom.category,
      categoryLabel: custom.categoryLabel ?? custom.category,
      icon: custom.icon ?? "⭐",
      templateText: custom.templateText,
      filledText: fillReputationTemplate(custom.templateText, businessName),
      isDefault: false,
      usageCount: custom.usageCount ?? 0,
    });
  }

  return merged;
}

export function isSafeGoogleReviewUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const isGoogleReviewHost = host === "google.com"
      || host.endsWith(".google.com")
      || host === "g.page"
      || host === "maps.app.goo.gl";
    return url.protocol === "https:" && isGoogleReviewHost;
  } catch {
    return false;
  }
}

export function buildGoogleReviewUrl(googleReviewLink: string | null | undefined, businessName: string) {
  if (googleReviewLink?.trim() && isSafeGoogleReviewUrl(googleReviewLink)) {
    return new URL(googleReviewLink.trim()).toString();
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(businessName)}/`;
}
