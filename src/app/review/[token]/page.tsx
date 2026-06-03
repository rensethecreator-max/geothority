import { notFound } from "next/navigation";
import { PublicReviewFlow } from "@/components/reputation/public-review-flow";
import { createServiceClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/reputation/request-service";
import { buildGoogleReviewUrl, generateReputationTemplates } from "@/lib/reputation/template-utils";

export default async function ReviewTokenPage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient();
  if (!supabase) notFound();

  const { data: requestRow, error: requestError } = await supabase
    .from("reputation_requests")
    .select("id, user_id, business_id, business_key, status, template_used")
    .eq("review_token", params.token)
    .maybeSingle();

  if (requestError && isMissingTableError(requestError)) {
    notFound();
  }

  if (!requestRow || !["pending", "sent", "public_review_ready", "feedback_received"].includes(requestRow.status)) {
    notFound();
  }

  const [{ data: settings }, { data: templates }, { data: brandProfile }] = await Promise.all([
    supabase
      .from("reputation_settings")
      .select("google_review_link")
      .eq("user_id", requestRow.user_id)
      .maybeSingle(),
    supabase
      .from("reputation_templates")
      .select("id, category, category_label, icon, template_text, usage_count")
      .eq("user_id", requestRow.user_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("business_brand_profiles")
      .select("logo_url, primary_color, accent_color, motif, tone")
      .eq("user_id", requestRow.user_id)
      .eq("business_key", requestRow.business_key || "business")
      .maybeSingle(),
  ]);

  const generated = generateReputationTemplates(
    requestRow.business_id,
    (templates ?? []).map((template: any) => ({
      id: template.id,
      category: template.category,
      categoryLabel: template.category_label,
      icon: template.icon,
      templateText: template.template_text,
      usageCount: template.usage_count ?? 0,
    })),
  );

  return (
    <PublicReviewFlow
      token={params.token}
      businessName={requestRow.business_id}
      googleUrl={buildGoogleReviewUrl(settings?.google_review_link, requestRow.business_id)}
      templates={generated.map((template) => ({
        id: template.id,
        categoryLabel: template.categoryLabel,
        icon: template.icon,
        filledText: template.filledText,
      }))}
      alreadyUsed={Boolean(requestRow.template_used)}
      initialStatus={requestRow.status}
      brand={
        brandProfile
          ? {
              logoUrl: brandProfile.logo_url,
              primaryColor: brandProfile.primary_color,
              accentColor: brandProfile.accent_color,
              motif: brandProfile.motif,
              tone: brandProfile.tone,
            }
          : null
      }
    />
  );
}
