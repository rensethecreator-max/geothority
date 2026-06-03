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
    "Hi {customer_name}! Thanks for choosing {business_name}. How was your experience? Reply 1-5 or use {review_link}. (Reply STOP to opt out)",
  enabledChannels: "sms",
  primaryChannel: "sms",
  emailSubject: "Quick question about your experience with {business_name}",
  emailTemplate:
    "Thanks for choosing {business_name}. How was your experience? Use this private link to leave quick feedback: {review_link}",
  sendBothDelayMinutes: 240,
  active: false,
};

export const DEFAULT_REPUTATION_TEMPLATES: ReputationTemplate[] = [
  {
    id: "service",
    category: "service",
    categoryLabel: "Great Value",
    icon: "💰",
    templateText:
      "I switched to {BUSINESS} and couldn’t be happier. The team was incredibly helpful and made sure I got exactly what I needed at a great price. Highly recommend to anyone looking for quality service!",
    isDefault: true,
    usageCount: 0,
  },
  {
    id: "knowledge",
    category: "knowledge",
    categoryLabel: "Fast & Professional",
    icon: "⚡",
    templateText:
      "Fast, professional, and really knows their stuff. {BUSINESS} answered all my questions and made the whole process completely painless. Five stars — will definitely be back.",
    isDefault: true,
    usageCount: 0,
  },
  {
    id: "personal",
    category: "personal",
    categoryLabel: "Personal Touch",
    icon: "❤️",
    templateText:
      "What sets {BUSINESS} apart is how much they genuinely care. They took the time to understand exactly what I needed and delivered beyond my expectations. Wish I’d come here sooner.",
    isDefault: true,
    usageCount: 0,
  },
  {
    id: "easy",
    category: "easy",
    categoryLabel: "Super Easy",
    icon: "✅",
    templateText:
      "The whole experience with {BUSINESS} was so much easier than I expected. Everything was handled quickly and professionally. No hassle, no stress — great experience from start to finish.",
    isDefault: true,
    usageCount: 0,
  },
];

export function fillReputationTemplate(template: string, businessName: string) {
  return template.replace(/\{BUSINESS\}/g, businessName);
}
