import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim();
    const ownership = searchParams.get("ownership")?.trim();
    const condition = searchParams.get("condition")?.trim();
    const productId = searchParams.get("product_id")?.trim();
    const ownerCompany = searchParams.get("owner_company")?.trim();

    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("device_items")
      .select(`
        *,
        product:product_catalog (
          id,
          sku,
          name,
          device_type
        ),
        current_plot:lh_house_plots (
          id,
          plot_code,
          land_plot,
          house_number,
          label
        )
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (ownership && ownership !== "all") query = query.eq("ownership_type", ownership);
    if (condition && condition !== "all") query = query.eq("condition", condition);
    if (productId) query = query.eq("product_id", productId);
    if (ownerCompany && ownerCompany !== "all") query = query.ilike("owner_company_name", `%${ownerCompany}%`);
    if (search) query = query.ilike("serial_number", `%${search}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const supabase = createSupabaseServerClient();

    // Support single item or array of items (batch barcode entry)
    const items = Array.isArray(body) ? body : [body];

    const insertData = items.map((item) => ({
      product_id: item.product_id,
      serial_number: item.serial_number?.trim(),
      ownership_type: item.ownership_type || "customer_consignment",
      owner_company_name: item.owner_company_name || "Land and Houses",
      condition: item.condition || "new",
      status: item.status || "in_stock",
      notes: item.notes || null,
    }));

    const { data, error } = await supabase
      .from("device_items")
      .upsert(insertData, { onConflict: "serial_number" })
      .select(`
        *,
        product:product_catalog (sku, name)
      `);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
