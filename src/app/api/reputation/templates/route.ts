import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_TEMPLATES, type ReputationTemplate } from "@/lib/reputation/defaults";

type ReputationTemplateRow = {
  id: string;
  category: ReputationTemplate["category"];
  category_label: string;
  icon: string;
  template_text: string;
  is_default: boolean;
  usage_count: number | null;
};

function isReputationTemplate(value: unknown): value is ReputationTemplate {
  if (!value || typeof value !== "object") return false;
  const template = value as Record<string, unknown>;
  return typeof template.id === "string" && template.id.length > 0
    && typeof template.category === "string" && ["service", "knowledge", "personal", "easy"].includes(template.category)
    && typeof template.categoryLabel === "string"
    && typeof template.icon === "string"
    && typeof template.templateText === "string" && template.templateText.trim().length > 0
    && typeof template.isDefault === "boolean"
    && typeof template.usageCount === "number" && Number.isInteger(template.usageCount) && template.usageCount >= 0;
}

function isMissingTableError(error: any) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || /relation .* does not exist/i.test(error?.message || "")
    || /Could not find the table .* in the schema cache/i.test(error?.message || "");
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("reputation_templates")
      .select("id, category, category_label, icon, template_text, is_default, usage_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ templates: DEFAULT_REPUTATION_TEMPLATES, setupRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ templates: DEFAULT_REPUTATION_TEMPLATES, setupRequired: false });
    }

    const rows: ReputationTemplateRow[] = data;
    return NextResponse.json({
      templates: rows.map((row) => ({
        id: row.id,
        category: row.category,
        categoryLabel: row.category_label,
        icon: row.icon,
        templateText: row.template_text,
        isDefault: row.is_default,
        usageCount: row.usage_count ?? 0,
      })),
      setupRequired: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templates } = await req.json();
    if (!Array.isArray(templates) || templates.length > 100 || !templates.every(isReputationTemplate)) {
      return NextResponse.json({ error: "A valid templates array with at most 100 entries is required" }, { status: 400 });
    }

    const normalized = templates.map((template: ReputationTemplate) => ({
      id: template.id.startsWith(`${user.id}:`) ? template.id : `${user.id}:${template.id}`,
      user_id: user.id,
      category: template.category,
      category_label: template.categoryLabel,
      icon: template.icon,
      template_text: template.templateText,
      is_default: Boolean(template.isDefault),
      usage_count: Number(template.usageCount ?? 0),
      updated_at: new Date().toISOString(),
    }));

    if (new Set(normalized.map(template => template.id)).size !== normalized.length) {
      return NextResponse.json({ error: "Template IDs must be unique" }, { status: 400 });
    }

    // Save replacements before removing old templates, so a failed write cannot erase the user's templates.
    const { error } = normalized.length
      ? await supabase.from("reputation_templates").upsert(normalized, { onConflict: "id" })
      : { error: null };

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: saved, error: readError } = await supabase
      .from("reputation_templates").select("id").eq("user_id", user.id);
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
    const savedRows: { id: string }[] = saved ?? [];
    const retainedIds = new Set(normalized.map(template => template.id));
    const obsoleteIds = savedRows.filter(template => !retainedIds.has(template.id)).map(template => template.id);
    if (obsoleteIds.length) {
      const { error: deleteError } = await supabase.from("reputation_templates")
        .delete().eq("user_id", user.id).in("id", obsoleteIds);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
