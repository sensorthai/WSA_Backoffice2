import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { createExpenseDocument } from "@/lib/flowaccount";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const itemsToSync: Array<{ id: string; type: "purchase" | "reimbursement"; categoryId?: string; systemCode?: string }> = 
      Array.isArray(body.items) ? body.items : [body];

    if (!itemsToSync || itemsToSync.length === 0 || !itemsToSync[0].id) {
      return NextResponse.json({ error: "กรุณาระบุรายการที่ต้องการส่งเข้า FlowAccount" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const results: any[] = [];

    for (const target of itemsToSync) {
      const { id, type, categoryId, systemCode } = target;
      const targetTable = type === "purchase" ? "purchase_requests" : "reimbursements";

      // 1. Fetch item from DB
      let itemData: any = null;
      if (type === "purchase") {
        const { data, error } = await supabase
          .from("purchase_requests")
          .select("*, users!purchase_requests_user_id_fkey(full_name, email)")
          .eq("id", id)
          .single();
        if (error || !data) {
          results.push({ id, type, success: false, error: error?.message || "Not found" });
          continue;
        }
        itemData = data;
      } else {
        const { data, error } = await supabase
          .from("reimbursements")
          .select("*, users!user_id(full_name, email)")
          .eq("id", id)
          .single();
        if (error || !data) {
          results.push({ id, type, success: false, error: error?.message || "Not found" });
          continue;
        }
        itemData = data;
      }

      // 2. Prepare payload for FlowAccount
      const vendorName = itemData.vendor_name || itemData.users?.full_name || "คู่ค้า/ผู้ให้บริการ";
      const referenceNo = type === "purchase" ? `PR-${id.substring(0, 8).toUpperCase()}` : `RE-${id.substring(0, 8).toUpperCase()}`;
      const docDate = itemData.document_date || itemData.expense_date || itemData.created_at?.split("T")[0];
      const isVat = Number(itemData.vat_amount || 0) > 0;

      const expenseItems = (itemData.items && Array.isArray(itemData.items) && itemData.items.length > 0)
        ? itemData.items.map((it: any) => ({
            description: it.name || it.description || itemData.title || itemData.description,
            quantity: Number(it.quantity || 1),
            unit_price: Number(it.unit_price ?? it.price ?? itemData.total_amount ?? itemData.amount ?? 0),
            total: Number(it.total ?? ((it.quantity || 1) * (it.unit_price ?? it.price ?? 0)))
          }))
        : [{
            description: itemData.title || itemData.description || "ค่าใช้จ่ายเบิกจ่าย",
            quantity: 1,
            unit_price: Number(itemData.total_amount || itemData.amount || 0),
            total: Number(itemData.total_amount || itemData.amount || 0)
          }];

      try {
        const flowResult = await createExpenseDocument({
          contactName: vendorName,
          contactAddress: itemData.vendor_address || "",
          contactTaxId: itemData.vendor_tax_id || "",
          publishedOn: docDate,
          dueDate: docDate,
          creditType: 3, // cash
          reference: referenceNo,
          remarks: itemData.purpose || itemData.title || itemData.description || "",
          subTotal: Number(itemData.amount_before_vat || (Number(itemData.total_amount || itemData.amount || 0) - Number(itemData.vat_amount || 0))),
          vatAmount: Number(itemData.vat_amount || 0),
          grandTotal: Number(itemData.total_amount || itemData.amount || 0),
          isVat: isVat,
          systemCode: systemCode,
          categoryId: categoryId,
          items: expenseItems,
          receiptUrl: itemData.receipt_url
        });

        // 3. Update Supabase with flowaccount_doc_number & fallback fields
        const syncedAt = new Date().toISOString();

        // 3.1 Try dedicated columns
        try {
          await supabase
            .from(targetTable)
            .update({
              flowaccount_doc_number: flowResult.documentSerial,
              flowaccount_synced_at: syncedAt
            })
            .eq("id", id);
        } catch {
          // ignore column missing
        }

        // 3.2 Update standard fields as persistent fallback
        if (type === "purchase") {
          const cleanManifest = (itemData.manifest_text || "").replace(/\[FLOWACCOUNT:[^\]]+\]\s*/g, "");
          const newManifest = `[FLOWACCOUNT:${flowResult.documentSerial}|${syncedAt}] ${cleanManifest}`.trim();
          await supabase
            .from("purchase_requests")
            .update({
              document_number: flowResult.documentSerial,
              manifest_text: newManifest
            })
            .eq("id", id);
        } else {
          const cleanFinance = (itemData.finance_note || "").replace(/\[FLOWACCOUNT:[^\]]+\]\s*/g, "");
          const newFinance = `[FLOWACCOUNT:${flowResult.documentSerial}|${syncedAt}] ${cleanFinance}`.trim();
          await supabase
            .from("reimbursements")
            .update({
              finance_note: newFinance
            })
            .eq("id", id);
        }

        results.push({
          id,
          type,
          success: true,
          documentSerial: flowResult.documentSerial,
          documentId: flowResult.documentId
        });
      } catch (flowErr: any) {
        console.error(`FlowAccount Sync Error for ${referenceNo}:`, flowErr);
        results.push({
          id,
          type,
          success: false,
          error: flowErr.message || "Failed to create expense in FlowAccount"
        });
      }
    }

    const overallSuccess = results.every(r => r.success);
    return NextResponse.json({
      success: overallSuccess,
      results
    });
  } catch (error: any) {
    console.error("Sync API Handler Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
