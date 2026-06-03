import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/reputation/request-service";

function maskEmail(email: string | null | undefined) {
  if (!email || !email.includes("@")) return "this email address";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

export default async function ReputationEmailOptOutPage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient();
  if (!supabase) notFound();

  const { data: requestRow, error } = await supabase
    .from("reputation_requests")
    .select("id, business_id, contact_id, contact:reputation_contacts(id, email)")
    .eq("review_token", params.token)
    .maybeSingle();

  if (error && isMissingTableError(error)) notFound();
  if (!requestRow?.contact_id) notFound();

  await supabase
    .from("reputation_contacts")
    .update({
      email_opt_out: true,
      preferred_channel: "sms",
    })
    .eq("id", requestRow.contact_id);

  const contact = Array.isArray(requestRow.contact) ? requestRow.contact[0] : requestRow.contact;
  const businessName = requestRow.business_id || "this business";

  return (
    <main className="min-h-screen bg-[#f7faf8] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-emerald-600">Email preferences updated</div>
        <h1 className="text-3xl font-semibold tracking-tight">You are opted out of email feedback requests.</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {businessName} will no longer send review or feedback requests to {maskEmail(contact?.email)} through Geothority email.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This only updates Geothority-powered feedback requests. It does not change any separate communication preferences you may have directly with the business.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white">
          Done
        </Link>
      </div>
    </main>
  );
}
