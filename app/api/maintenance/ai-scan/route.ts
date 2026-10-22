import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // Allow operation for authenticated users and local backoffice operators

    let base64Data = "";
    let mimeType = "image/jpeg";
    let filename = "uploaded_file";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
      }
      filename = file.name;
      mimeType = file.type || (filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      const buffer = Buffer.from(await file.arrayBuffer());
      base64Data = buffer.toString("base64");
    } else {
      // JSON body with base64 or dataUrl
      const body = await req.json();
      if (!body.dataUrl && !body.base64) {
        return NextResponse.json({ error: "ไม่พบข้อมูลรูปภาพหรือเอกสาร" }, { status: 400 });
      }

      if (body.dataUrl) {
        const matches = body.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = body.dataUrl;
        }
      } else {
        base64Data = body.base64;
        mimeType = body.mimeType || "image/jpeg";
      }
      filename = body.filename || "attached_document";
    }

    // Ensure valid base64
    if (!base64Data || base64Data.trim().length === 0) {
      return NextResponse.json({ error: "ไฟล์เอกสารว่างเปล่าหรือไม่มีข้อมูล" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "ไม่พบคีย์ AI (GEMINI_API_KEY)" }, { status: 500 });
    }

    // Prompt engineered for Sakol Work / Maintenance Exchanges
    const prompt = `คุณคือระบบ AI ผู้เชี่ยวชาญการอ่านเอกสารทางเทคนิคและใบขอเปลี่ยนอุปกรณ์ / ใบส่งซ่อม / ใบขอเบิกอุปกรณ์ของ บริษัท สากลเวิร์ค จำกัด (SAKOL WORK CO., LTD) หรือเอกสารงานบำรุงรักษาอุปกรณ์ Airplus / Land & Houses
กรุณาวิเคราะห์เอกสาร (รูปถ่าย หรือ PDF) ที่แนบมานี้อย่างละเอียดที่สุด แล้วสกัดข้อมูลออกมาเป็น JSON ตามโครงสร้างต่อไปนี้:

1. sakol_doc_no: เลขที่เอกสาร (เช่น LHSAV-SQ-6707-C030 หรือเลขที่ใบขอเปลี่ยน/ใบแจ้งซ่อมที่ปรากฏบนเอกสาร หากไม่พบให้สร้างตามรูปแบบที่สมเหตุสมผล)
2. sakol_doc_date: วันที่เอกสาร (แปลงเป็นรูปแบบ YYYY-MM-DD เช่น 2024-07-06 หรือวันที่ที่ระบุในเอกสาร ถ้าเป็นปี พ.ศ. ให้แปลงเป็น ค.ศ.)
3. partner_name: ชื่อบริษัทผู้ขอเปลี่ยน (ค่าเริ่มต้น: "บริษัท สากลเวิร์ค จำกัด")
4. recipient_company: บริษัทผู้รับ/ผู้ให้เบิก (เช่น "บริษัท ยิบอินซอย จำกัด")
5. received_by: ชื่อผู้ขอเบิก / ตัวแทนที่ลงชื่อขอเบิก (ถ้ามีระบุในเอกสาร)
6. notes: หมายเหตุสรุปหรือหัวข้อของเอกสาร
7. items: รายการอุปกรณ์ทั้งหมดที่ขอเปลี่ยน โดยแต่ละรายการให้ระบุ:
   - product_sku: เลือกระหว่าง:
     * 'AP-CTRL' (สำหรับ Controller " Airplus ", กล่องควบคุม, Airplus Controller, ชุดควบคุม PM2.5)
     * 'AP-8PORT' (สำหรับ Air Plus 8 Port Extension, Extension Board, บอร์ดขยาย 8 Port)
     * 'SN-PM25' (สำหรับ Sensor, Sensor PM 2.5, เซ็นเซอร์)
     * 'OTHER' (หากเป็นอุปกรณ์อื่น)
   - product_name: ชื่อสินค้าตามที่ปรากฏในเอกสาร (เช่น 'Controller " Airplus "', 'Sensor', 'Air Plus 8 Port Extension')
   - quantity: จำนวนชิ้น (ตัวเลขจำนวนเต็มบวก)
   - defect_notes: อาการเสีย / แปลงบ้าน / ชื่อโครงการ / เลขที่บ้านที่ปรากฏในเอกสาร (เช่น "- MMK2 140/54 สั่งให้พัดลมทำงานไม่ได้", "- C15 234/286 ไฟ LED ไม่ติด", "- VR2 45/114 Sensor ค่าสูง")
   - defective_received_sn: Serial Number ของอุปกรณ์เสียเดิมที่ส่งมา (ถ้ามีระบุไว้)

ตอบกลับเป็นรูปแบบ JSON Object ตามโครงสร้างนี้เท่านั้น ไม่ต้องใส่ markdown code fence ใดๆ`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const aiJson = await aiRes.json();

    if (!aiRes.ok) {
      console.error("Gemini API Error:", aiJson);
      return NextResponse.json(
        { error: aiJson.error?.message || "AI ไม่สามารถอ่านเอกสารได้ในขณะนี้" },
        { status: 502 }
      );
    }

    const candidate = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      return NextResponse.json({ error: "AI ไม่พบข้อมูลในเอกสารที่แนบ" }, { status: 422 });
    }

    let parsedData: any = {};
    try {
      const cleanJson = candidate.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", candidate);
      return NextResponse.json({ error: "รูปแบบข้อมูลที่ AI ส่งกลับไม่ถูกต้อง" }, { status: 500 });
    }

    // Now auto-match refurbished devices from database!
    const supabase = createSupabaseServerClient();
    const { data: availableRefurbished } = await supabase
      .from("device_items")
      .select(`
        id,
        serial_number,
        condition,
        status,
        owner_company_name,
        product:product_catalog (
          sku,
          name
        )
      `)
      .eq("condition", "repaired_refurbished")
      .eq("status", "in_stock");

    const refurbishedList = availableRefurbished || [];
    const usedRefurbishedIds = new Set<string>();

    const enrichedItems = (parsedData.items || []).map((item: any) => {
      // Find a matching refurbished unit not yet assigned
      const match =
        refurbishedList.find((ref: any) => {
          if (usedRefurbishedIds.has(ref.id)) return false;
          const refSku = (ref.product as any)?.sku;
          return item.product_sku && refSku === item.product_sku;
        }) ||
        refurbishedList.find((ref: any) => !usedRefurbishedIds.has(ref.id));

      if (match) {
        usedRefurbishedIds.add(match.id);
        return {
          ...item,
          refurbished_sn: match.serial_number,
          refurbished_device_id: match.id,
        };
      }

      return {
        ...item,
        refurbished_sn: item.refurbished_sn || "",
      };
    });

    return NextResponse.json({
      success: true,
      extracted: {
        sakol_doc_no: parsedData.sakol_doc_no || "",
        sakol_doc_date: parsedData.sakol_doc_date || new Date().toISOString().slice(0, 10),
        partner_name: parsedData.partner_name || "บริษัท สากลเวิร์ค จำกัด",
        recipient_company: parsedData.recipient_company || "บริษัท ยิบอินซอย จำกัด",
        received_by: parsedData.received_by || "ตัวแทน บริษัท สากลเวิร์ค จำกัด",
        notes: parsedData.notes || "",
        items: enrichedItems,
      },
    });
  } catch (err: any) {
    console.error("AI Scan route error:", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในการประมวลผล AI" }, { status: 500 });
  }
}
