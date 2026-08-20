import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all"; // 'all' | 'pending' | 'synced'

  const supabase = createSupabaseServerClient();

  // 1. Query Purchase Requests (approved or paid)
  let pQuery = supabase
    .from("purchase_requests")
    .select("*, users!purchase_requests_user_id_fkey(full_name, email, departments(name))")
    .in("status", ["approved", "paid"])
    .order("created_at", { ascending: false });

  const { data: purchases, error: pError } = await pQuery;
  if (pError) {
    console.error("Fetch purchases error:", pError);
  }

  // 2. Query Reimbursements (approved or paid)
  let rQuery = supabase
    .from("reimbursements")
    .select("*, users!user_id(full_name, email, departments(name))")
    .in("status", ["approved", "paid"])
    .order("created_at", { ascending: false });

  const { data: reimbursements, error: rError } = await rQuery;
  if (rError) {
    console.error("Fetch reimbursements error:", rError);
  }

  const formattedItems: any[] = [];

  (purchases || []).forEach((p: any) => {
    const isSynced = Boolean(p.flowaccount_doc_number);
    if (filter === "pending" && isSynced) return;
    if (filter === "synced" && !isSynced) return;

    formattedItems.push({
      id: p.id,
      type: "purchase",
      title: p.title,
      referenceNo: `PR-${p.id.substring(0, 8).toUpperCase()}`,
      documentNumber: p.document_number || null,
      date: p.document_date || p.created_at?.split("T")[0],
      requesterName: p.users?.full_name || p.users?.email || "พนักงาน",
      requesterDept: (p.users?.departments as any)?.name || "-",
      vendorName: p.vendor_name || p.users?.full_name || "ไม่ระบุร้านค้า/คู่ค้า",
      vendorAddress: p.vendor_address || "",
      vendorTaxId: p.vendor_tax_id || "",
      purpose: p.purpose || p.title,
      amountBeforeVat: p.amount_before_vat || (p.total_amount - (p.vat_amount || 0)),
      vatAmount: p.vat_amount || 0,
      totalAmount: p.total_amount,
      items: p.items || [],
      receiptUrl: p.receipt_url,
      status: p.status,
      flowaccountDocNumber: p.flowaccount_doc_number || null,
      flowaccountSyncedAt: p.flowaccount_synced_at || null,
      createdAt: p.created_at
    });
  });

  (reimbursements || []).forEach((r: any) => {
    const isSynced = Boolean(r.flowaccount_doc_number);
    if (filter === "pending" && isSynced) return;
    if (filter === "synced" && !isSynced) return;

    formattedItems.push({
      id: r.id,
      type: "reimbursement",
      title: r.description || "ใบเบิกเงินสดย่อย",
      referenceNo: `RE-${r.id.substring(0, 8).toUpperCase()}`,
      documentNumber: null,
      date: r.expense_date || r.created_at?.split("T")[0],
      requesterName: r.users?.full_name || r.users?.email || "พนักงาน",
      requesterDept: (r.users?.departments as any)?.name || "-",
      vendorName: r.users?.full_name || "พนักงานสำรองจ่าย",
      vendorAddress: "",
      vendorTaxId: "",
      purpose: r.description || "ค่าใช้จ่ายเบิกจ่าย",
      amountBeforeVat: r.amount,
      vatAmount: 0,
      totalAmount: r.amount,
      items: [{ description: r.description, quantity: 1, unit_price: r.amount, total: r.amount }],
      receiptUrl: r.receipt_url,
      status: r.status,
      flowaccountDocNumber: r.flowaccount_doc_number || null,
      flowaccountSyncedAt: r.flowaccount_synced_at || null,
      createdAt: r.created_at
    });
  });

  formattedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(formattedItems);
}
