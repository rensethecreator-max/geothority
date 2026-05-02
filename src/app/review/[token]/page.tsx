import { notFound } from "next/navigation";
import { PublicReviewFlow } from "@/components/reputation/public-review-flow";
import { createServiceClient } from "@/lib/supabase/server";
import { buildGoogleReviewUrl, generateReputationTemplates } from "@/lib/reputation/template-utils";

export default async function ReviewTokenPage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient();
  if (!supabase) notFound();

  const { data: requestRow } = await supabase
    .from("reputation_requests")
    .select("id, user_id, business_id, template_used")
    .eq("review_token", params.token)
    .maybeSingle();

  if (!requestRow) {
    notFound();
  }

  const [{ data: settings }, { data: templates }] = await Promise.all([
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
      businessName={requestRow.business_id}
      googleUrl={buildGoogleReviewUrl(settings?.google_review_link, requestRow.business_id)}
      templates={generated.map((template) => ({
        id: template.id,
        categoryLabel: template.categoryLabel,
        icon: template.icon,
        filledText: template.filledText,
      }))}
      alreadyUsed={Boolean(requestRow.template_used)}
    />
  );
}
