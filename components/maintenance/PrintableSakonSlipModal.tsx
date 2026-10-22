"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileCheck } from "lucide-react";

export interface SakonExchangeData {
  id: string;
  exchange_no: string;
  sakol_doc_no: string;
  sakol_doc_date: string;
  partner_name: string;
  recipient_company: string;
  pdf_file_url?: string;
  notes?: string;
  received_by?: string;
  issued_by?: string;
  created_at: string;
  items: Array<{
    id: string;
    product_sku: string;
    product_name: string;
    defect_notes?: string;
    quantity: number;
    refurbished_sn?: string;
    defective_received_sn?: string;
  }>;
}

interface PrintableSakonSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchange: SakonExchangeData | null;
}

export function PrintableSakonSlipModal({ isOpen, onClose, exchange }: PrintableSakonSlipModalProps) {
  if (!isOpen || !exchange) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-slate-50 no-print flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              เอกสารส่งมอบอุปกรณ์เปลี่ยนทดแทน (Refurbished Replacement Slip)
            </DialogTitle>
            <p className="text-xs text-slate-500">
              อ้างอิงใบขอเปลี่ยนของสากลเวิร์ค: <strong className="text-slate-800">{exchange.sakol_doc_no}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 mr-6">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสารส่งมอบ (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white text-black p-8 max-w-[210mm] mx-auto border border-slate-300 shadow-sm print:p-0 print:border-none print:shadow-none font-sans text-[12.5px] leading-relaxed">
            {/* Header info */}
            <div className="border-b-2 border-black pb-3 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm text-slate-900">บริษัท สากลเวิร์ค จำกัด (SAKOL WORK CO., LTD)</div>
                  <div className="text-[11px] text-slate-600">
                    772/2-4, 773, 773/1 ถนนประชาชื่น แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพฯ 10800
                  </div>
                  <div className="text-[11px] text-slate-600">
                    โทรศัพท์ 02-9112970-8 | โทรสาร 02-9112969 | www.sakolgroup.com
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-indigo-900">เลขที่อ้างอิง: {exchange.sakol_doc_no}</div>
                  <div className="text-slate-600">วันที่ตามเอกสาร: {new Date(exchange.sakol_doc_date).toLocaleDateString('th-TH')}</div>
                  <div className="text-slate-500 text-[10px]">เลขที่ใบส่งมอบ: {exchange.exchange_no}</div>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center font-bold text-base mb-1">
              เอกสารส่งมอบอุปกรณ์เปลี่ยนทดแทน (Refurbished Replacement)
            </div>
            <div className="text-center text-xs text-slate-600 mb-5">
              ผู้ให้เบิก: {exchange.recipient_company} / บริษัท ดับเบิ้ลยู เอส เอ จำกัด
            </div>

            {/* Section 1: Defective items returned by Sakon */}
            <div className="mb-5">
              <div className="font-bold text-xs mb-1.5 flex items-center justify-between">
                <span>1. รายละเอียดอุปกรณ์เสียหายที่นำมาเปลี่ยน (Defective Received):</span>
                <span className="text-[11px] font-normal text-slate-500">รับเข้าคลังเพื่อส่งซ่อม</span>
              </div>
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-slate-100 print:bg-transparent">
                    <th className="border border-black p-1.5 w-12">ลำดับ</th>
                    <th className="border border-black p-1.5 text-left pl-3">รายการอุปกรณ์</th>
                    <th className="border border-black p-1.5 w-16">จำนวน</th>
                    <th className="border border-black p-1.5 text-left pl-3">หมายเหตุ / อาการเสียและแปลงบ้าน</th>
                  </tr>
                </thead>
                <tbody>
                  {exchange.items.map((item, idx) => (
                    <tr key={item.id + "def"}>
                      <td className="border border-black p-1">{idx + 1}</td>
                      <td className="border border-black p-1 text-left pl-3 font-semibold">
                        {item.product_name}
                      </td>
                      <td className="border border-black p-1 font-bold">{item.quantity} ชิ้น</td>
                      <td className="border border-black p-1 text-left pl-3 text-[11px]">
                        {item.defect_notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 2: Refurbished replacement items issued to Sakon */}
            <div className="mb-6">
              <div className="font-bold text-xs mb-1.5 flex items-center justify-between">
                <span>2. รายการอุปกรณ์ Refurbished ที่ส่งมอบให้ สากลเวิร์ค นำกลับไปใช้งาน (Replacement Issued):</span>
                <span className="text-[11px] font-normal text-slate-500">สภาพซ่อมเสร็จผ่านการทดสอบ QC</span>
              </div>
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-slate-100 print:bg-transparent">
                    <th className="border border-black p-1.5 w-12">ลำดับ</th>
                    <th className="border border-black p-1.5 text-left pl-3">รายการอุปกรณ์ Refurbished</th>
                    <th className="border border-black p-1.5 w-40">Serial Number (S/N)</th>
                    <th className="border border-black p-1.5 w-24">สภาพสินค้า</th>
                    <th className="border border-black p-1.5 w-20">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {exchange.items.map((item, idx) => (
                    <tr key={item.id + "ref"}>
                      <td className="border border-black p-1">{idx + 1}</td>
                      <td className="border border-black p-1 text-left pl-3 font-medium">
                        {item.product_name}
                      </td>
                      <td className="border border-black p-1 font-mono font-bold text-indigo-900">
                        {item.refurbished_sn || "จ่ายตามสต็อก Refurbished"}
                      </td>
                      <td className="border border-black p-1 text-[11px]">
                        Refurbished
                      </td>
                      <td className="border border-black p-1">{item.quantity} ชิ้น</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notice / Terms */}
            <div className="text-[11px] text-slate-700 space-y-0.5 mb-8 border-t pt-2">
              <div>** หมายเหตุ: อุปกรณ์ที่ได้รับไปเป็นอุปกรณ์สภาพ Refurbished ที่ผ่านการทดสอบคุณภาพมาตรฐานเรียบร้อยแล้ว</div>
              <div>หากพบปัญหาการใช้งานในการติดตั้ง กรุณาติดต่อฝ่ายเทคนิค บริษัท ยิบอินซอย จำกัด / WSA ทันที</div>
            </div>

            {/* Signature Block matching Sakon's original doc */}
            <div className="grid grid-cols-3 gap-4 text-center text-xs pt-4 border-t border-dashed border-slate-400">
              <div>
                <div>( .................................................... )</div>
                <div className="font-semibold mt-1">ผู้อนุมัติขอเบิกอุปกรณ์</div>
                <div className="mt-1 text-[11px]">วันที่ ......./......./.......</div>
                <div className="mt-3 font-medium text-slate-700">บริษัท สากลเวิร์ค จำกัด</div>
              </div>

              <div>
                <div>( .................................................... )</div>
                <div className="font-semibold mt-1">ผู้รับอุปกรณ์</div>
                <div className="mt-1 text-[11px]">วันที่ ......./......./.......</div>
                <div className="mt-1 text-[11px] font-bold text-slate-800">(ได้รับอุปกรณ์ครบถ้วน)</div>
                <div className="mt-1 font-medium text-slate-700">บริษัท สากลเวิร์ค จำกัด</div>
              </div>

              <div>
                <div>( {exchange.issued_by || "...................................................."} )</div>
                <div className="font-semibold mt-1">ผู้ให้เบิกอุปกรณ์</div>
                <div className="mt-1 text-[11px]">วันที่ ......./......./.......</div>
                <div className="mt-3 font-medium text-slate-700">{exchange.recipient_company}</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t bg-slate-50 no-print">
          <Button variant="outline" size="sm" onClick={onClose}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
