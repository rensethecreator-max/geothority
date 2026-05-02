import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_TEMPLATES } from "@/lib/reputation/defaults";

function isMissingTableError(error: any) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("reputation_templates")
      .select("id, category, category_label, icon, template_text, is_default, usage_count")
      .eq("user_id", session.user.id)
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

    return NextResponse.json({
      templates: data.map((row) => ({
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
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templates } = await req.json();
    if (!Array.isArray(templates)) {
      return NextResponse.json({ error: "templates array required" }, { status: 400 });
    }

    const normalized = templates.map((template: any) => ({
      id: template.id,
      user_id: session.user.id,
      category: template.category,
      category_label: template.categoryLabel,
      icon: template.icon,
      template_text: template.templateText,
      is_default: Boolean(template.isDefault),
      usage_count: Number(template.usageCount ?? 0),
      updated_at: new Date().toISOString(),
    }));

    const { error: deleteError } = await supabase.from("reputation_templates").delete().eq("user_id", session.user.id);
    if (deleteError && !isMissingTableError(deleteError)) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error } = await supabase.from("reputation_templates").insert(normalized);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
