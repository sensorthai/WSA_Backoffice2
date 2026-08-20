import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createExpenseDocument } from "@/lib/flowaccount";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const testResult = await createExpenseDocument({
      contactName: "บริษัท อีเล็คทริค แอนด์ เคเบิล จำกัด",
      publishedOn: today,
      dueDate: today,
      creditType: 3,
      reference: `TEST-${Date.now().toString().slice(-6)}`,
      remarks: "ทดสอบการสร้างใบบันทึกค่าใช้จ่ายผ่าน FlowAccount OpenAPI",
      isVat: true,
      vatAmount: 105.52,
      subTotal: 1507.48,
      grandTotal: 1613.00,
      items: [
        { description: "กล่องพลาสติกกันน้ำ สีดำ 5X10 NANO-203B", quantity: 1, unit_price: 85.98, total: 85.98 },
        { description: "กล่องพลาสติกกันน้ำ สีดำ 8X12 NANO-207B", quantity: 1, unit_price: 130.84, total: 130.84 },
        { description: 'เกลียวปล่อยปลายสว่าน หัวแบน 8x3/4" (100/2000)', quantity: 1, unit_price: 20.56, total: 20.56 },
        { description: 'เกลียวปล่อย หัวนูน 7x2" (50/500)', quantity: 1, unit_price: 23.36, total: 23.36 },
        { description: "ตู้กันน้ำ ฝา1ชั้น ไม่มีหลังคา JQ-06 350X500X200 KJL", quantity: 1, unit_price: 1238.32, total: 1238.32 },
        { description: 'แคล้มจับท่อหนาขาคู่ IMC 1" (100ตัว/ถุง)', quantity: 2, unit_price: 1.87, total: 3.74 },
        { description: 'แคล้มจับท่อหนาขาคู่ IMC 1.1/4"', quantity: 2, unit_price: 2.34, total: 4.68 }
      ]
    });

    return NextResponse.json({
      success: true,
      message: "สร้างใบบันทึกค่าใช้จ่ายทดสอบสำเร็จ!",
      ...testResult
    });
  } catch (error: any) {
    console.error("Test Create Expense Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create test expense" }, { status: 500 });
  }
}
