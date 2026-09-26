import { notFound } from "next/navigation";
import { PublicReviewFlow } from "@/components/reputation/public-review-flow";
import { createOptionalServiceClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/reputation/request-service";
import { buildGoogleReviewUrl } from "@/lib/reputation/template-utils";

export default async function ReviewTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createOptionalServiceClient();
  if (!supabase) notFound();

  const { data: requestRow, error: requestError } = await supabase
    .from("reputation_requests")
    .select("id, user_id, business_id, business_key, status, replied_at")
    .eq("review_token", token)
    .maybeSingle();

  if (requestError && isMissingTableError(requestError)) {
    notFound();
  }

  if (!requestRow || !["pending", "sent", "public_review_ready", "feedback_received"].includes(requestRow.status)) {
    notFound();
  }

  const [{ data: settings }, { data: brandProfile }] = await Promise.all([
    supabase
      .from("reputation_settings")
      .select("google_review_link")
      .eq("user_id", requestRow.user_id)
      .maybeSingle(),
    supabase
      .from("business_brand_profiles")
      .select("logo_url, primary_color, accent_color, motif, tone")
      .eq("user_id", requestRow.user_id)
      .eq("business_key", requestRow.business_key || "business")
      .maybeSingle(),
  ]);

  return (
    <PublicReviewFlow
      token={token}
      businessName={requestRow.business_id}
      googleUrl={buildGoogleReviewUrl(settings?.google_review_link, requestRow.business_id)}
      hasPriorResponse={Boolean(requestRow.replied_at)}
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
