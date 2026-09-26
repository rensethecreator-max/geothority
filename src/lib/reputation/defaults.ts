export type ReputationTemplateCategory = "service" | "knowledge" | "personal" | "easy";

export interface ReputationSettings {
  googleReviewLink: string;
  smsDelayMinutes: number;
  positiveThreshold: number;
  smsTemplate: string;
  enabledChannels: "sms" | "email" | "sms_email";
  primaryChannel: "sms" | "email";
  emailSubject: string;
  emailTemplate: string;
  sendBothDelayMinutes: number;
  active: boolean;
}

export interface ReputationTemplate {
  id: string;
  category: ReputationTemplateCategory;
  categoryLabel: string;
  icon: string;
  templateText: string;
  isDefault: boolean;
  usageCount: number;
}

export const DEFAULT_REPUTATION_SETTINGS: ReputationSettings = {
  googleReviewLink: "",
  smsDelayMinutes: 60,
  positiveThreshold: 4,
  smsTemplate:
    "Hi {customer_name}, thanks for choosing {business_name}. If you’d like, share honest feedback or a public review here: {review_link}. Reply STOP to opt out.",
  enabledChannels: "sms",
  primaryChannel: "sms",
  emailSubject: "Quick question about your experience with {business_name}",
  emailTemplate:
    "Thanks for choosing {business_name}. If you’d like, share private feedback or an honest public review here: {review_link}. Please use your own words and share only what reflects your experience.",
  sendBothDelayMinutes: 240,
  active: false,
};

export const DEFAULT_REPUTATION_TEMPLATES: ReputationTemplate[] = [
  {
    id: "service",
    category: "service",
    categoryLabel: "Describe the service",
    icon: "📝",
    templateText: "In your own words, describe what happened and anything you would like others to know.",
    isDefault: true,
    usageCount: 0,
  },
  {
    id: "knowledge",
    category: "knowledge",
    categoryLabel: "Share useful details",
    icon: "🔎",
    templateText: "Share only details that reflect your own experience. Your feedback may be positive, mixed, or critical.",
    isDefault: true,
    usageCount: 0,
  },
  {
    id: "personal",
    category: "personal",
    categoryLabel: "Use your own words",
    icon: "💬",
    templateText: "There is no required rating or wording. You can leave a review, private feedback, both, or neither.",
    isDefault: true,
    usageCount: 0,
  },
  {
    id: "easy",
    category: "easy",
    categoryLabel: "No pressure",
    icon: "✅",
    templateText: "A review is optional. Do not include information you do not want to share publicly.",
    isDefault: true,
    usageCount: 0,
  },
];

export function fillReputationTemplate(template: string, businessName: string) {
  return template.replace(/\{BUSINESS\}/g, businessName);
}
