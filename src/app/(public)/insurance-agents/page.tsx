import { Metadata } from "next";
import IndustryPage from "../for/[slug]/page";

export const metadata: Metadata = {
  title: "Local Visibility for Independent Insurance Agencies | Geothority",
  description: "Help local insurance shoppers find and understand your agency. Identify website visibility gaps, prioritize improvements, and prepare content for your review.",
  alternates: { canonical: "https://geothority.io/insurance-agents" },
};

export default async function InsuranceAgentsPage() {
  return IndustryPage({ params: Promise.resolve({ slug: "insurance-agents" }) });
}
