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
    // Extract FlowAccount Doc No from dedicated column, document_number, or manifest tag
    const manifestMatch = p.manifest_text?.match(/\[FLOWACCOUNT:([^\|\]]+)(?:\|([^\]]+))?\]/);
    const flowDocNo = p.flowaccount_doc_number || (p.document_number?.startsWith("EXP") ? p.document_number : null) || manifestMatch?.[1] || null;
    const flowSyncedTime = p.flowaccount_synced_at || manifestMatch?.[2] || (flowDocNo ? p.updated_at : null);

    const isSynced = Boolean(flowDocNo);
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
      flowaccountDocNumber: flowDocNo,
      flowaccountSyncedAt: flowSyncedTime,
      createdAt: p.created_at
    });
  });

  (reimbursements || []).forEach((r: any) => {
    // Extract FlowAccount Doc No from dedicated column, finance_note or training_note
    const financeMatch = (r.finance_note || r.training_note)?.match(/\[FLOWACCOUNT:([^\|\]]+)(?:\|([^\]]+))?\]/);
    const flowDocNo = r.flowaccount_doc_number || financeMatch?.[1] || null;
    const flowSyncedTime = r.flowaccount_synced_at || financeMatch?.[2] || (flowDocNo ? r.updated_at : null);

    const isSynced = Boolean(flowDocNo);
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
      flowaccountDocNumber: flowDocNo,
      flowaccountSyncedAt: flowSyncedTime,
      createdAt: r.created_at
    });
  });

  formattedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(formattedItems);
}
