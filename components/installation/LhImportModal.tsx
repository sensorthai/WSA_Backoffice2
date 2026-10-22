"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadLhPlotTemplate } from "@/lib/excel-templates";

interface LhImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LhImportModal({ isOpen, onClose, onSuccess }: LhImportModalProps) {
  const [tsvText, setTsvText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!tsvText.trim()) {
      toast.error("กรุณาวางข้อมูลจาก Excel หรือ Google Sheet");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/lh/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tsvText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
      }

      toast.success(`นำเข้าข้อมูลแปลงบ้านสำเร็จ ${data.importedCount} รายการ!`);
      setTsvText("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInsertSample = () => {
    const sample = `name\ttype\tlabel\thouse_number\taccount_code\tland_plot\thome_series\tproject_code\tproject\taddress\tรหัสใบสั่งซื้อ\tวันที่สั่งซื้อ (ค.ศ.)\tocc_id\tส่งมอบในระบบ\tวันที่ PO เพิ่มใหม่ (ค.ศ.)\tLOT\tแหล่งชีต\tสถานะส่งมอบ
LH372-02B01-210PW334T\tHouse\t90/109 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/109\tLH372\t02B01\t210PW334T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/109 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726300837\t27/09/2020\t90/109 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02B01\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02C03-210PW334T\tHouse\t90/119 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/119\tLH372\t02C03\t210PW334T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/119 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726300870\t29/09/2020\t90/119 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02C03\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02C09-150PW324T\tHouse\t90/124 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/124\tLH372\t02C09\t150PW324T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/124 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301134\t23/10/2020\t90/124 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02C09\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02D07-177PW324T\tHouse\t90/132 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/132\tLH372\t02D07\t177PW324T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/132 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301354\t18/11/2020\t90/132 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02D07\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02D08-210PW334T\tHouse\t90/131 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/131\tLH372\t02D08\t210PW334T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/131 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301229\t29/10/2020\t90/131 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02D08\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02L07-177PW324T\tHouse\t90/139 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/139\tLH372\t02L07\t177PW324T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/139 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301472\t21/11/2020\t90/139 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02L07\t\t29/09/2021\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH354-01B01-103SI115C\tHouse\t168/402 Villaggio บางใหญ่\t168/402\tLH354\t01B01\t103SI115C\tVY\tVillaggio บางใหญ่\t168/402 หมู่ 9 ต.บ้านใหม่ อ.บางใหญ่ จ.นนทบุรี 11140\tLH3546504727\t10/11/2022\t168/402 Villaggio บางใหญ่ - VY 01B01\t\t10/11/2022\tLot 1,500\tAsset_House 1,500\tยังไม่ส่งมอบ
LA030-00N16-236OW236B\tHouse\t456/167 มัณฑนา บางนา กม.15\t456/167\tLA030\t00N16\t236OW236B\tM15\tมัณฑนา บางนา กม.15\t456/167 หมู่ 3 ถ.บางนาตราด กม.15 ต.บางโฉลง อ.บางพลี จ.สมุทรปราการ 10540\tLA0306503596\t10/11/2022\t456/167 มัณฑนา บางนา กม.15 - M15 00N16\t\t10/11/2022\tLot 1,500\tAsset_House 1,500\tยังไม่ส่งมอบ
LH380-00K01-155FD127B\tHouse\t468/106 CHAIYAPRUEK บางนา กม.13\t468/106\tLH380\t00K01\t155FD127B\tC13\tCHAIYAPRUEK บางนา กม.13\t468/106 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540\tLH3806603750\t28/12/2023\t468/106 CHAIYAPRUEK บางนา กม.13 - C13 00K01\t\t06/01/2024\tLot 1,000\tAsset_House 1,000\tยังไม่ส่งมอบ
LH380-00K02-155FD127B\tHouse\t468/107 CHAIYAPRUEK บางนา กม.13\t468/107\tLH380\t00K02\t155FD127B\tC13\tCHAIYAPRUEK บางนา กม.13\t468/107 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540\tLH3806603752\t28/12/2023\t468/107 CHAIYAPRUEK บางนา กม.13 - C13 00K02\t\t06/01/2024\tLot 1,000\tAsset_House 1,000\tยังไม่ส่งมอบ
LH380-00K03-155FD127B\tHouse\t468/108 CHAIYAPRUEK บางนา กม.13\t468/108\tLH380\t00K03\t155FD127B\tC13\tCHAIYAPRUEK บางนา กม.13\t468/108 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540\tLH3806603753\t28/12/2023\t468/108 CHAIYAPRUEK บางนา กม.13 - C13 00K03\t\t06/01/2024\tLot 1,000\tAsset_House 1,000\tยังไม่ส่งมอบ
LH380-00K04-131FD127B\tHouse\t468/109 CHAIYAPRUEK บางนา กม.13\t468/109\tLH380\t00K04\t131FD127B\tC13\tCHAIYAPRUEK บางนา กม.13\t468/109 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540\tLH3806603853\t29/12/2023\t468/109 CHAIYAPRUEK บางนา กม.13 - C13 00K04\t\t06/01/2024\tLot 1,000\tAsset_House 1,000\tยังไม่ส่งมอบ`;
    setTsvText(sample);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
            นำเข้าข้อมูลแปลงบ้าน Land & Houses จาก Excel / Google Sheets
          </DialogTitle>
          <p className="text-xs text-slate-500">
            ก๊อปปี้ตารางจากไฟล์ Excel หรือ Google Sheets (รวมแถวหัวตาราง) แล้วนำมาวางในช่องด้านล่างนี้ได้โดยตรง
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600 font-medium">วางข้อมูลแบบ Tab-Separated (TSV):</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadLhPlotTemplate}
                className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-7 px-2 gap-1"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                ดาวน์โหลดไฟล์ต้นแบบ (.xlsx)
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleInsertSample}
                className="text-xs text-indigo-600 h-auto p-0"
              >
                + ใส่ข้อมูลตัวอย่าง (12 แปลง)
              </Button>
            </div>
          </div>

          <textarea
            value={tsvText}
            onChange={(e) => setTsvText(e.target.value)}
            placeholder="วางข้อมูลตารางที่นี่... ตัวอย่างหัวตาราง: name  type  label  house_number  account_code  land_plot  home_series  project_code  project  address  รหัสใบสั่งซื้อ..."
            rows={10}
            className="w-full text-xs font-mono p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={isSubmitting || !tsvText.trim()}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังนำเข้าข้อมูล...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                เริ่มนำเข้าข้อมูลแปลงบ้าน
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
