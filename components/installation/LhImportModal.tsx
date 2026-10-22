"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  FileSpreadsheet,
  X,
  FileText,
  Table,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { downloadLhPlotTemplate } from "@/lib/excel-templates";

interface LhImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LhImportModal({ isOpen, onClose, onSuccess }: LhImportModalProps) {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [tsvText, setTsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processWorkbook = (workbook: XLSX.WorkBook, fileName: string, fileSizeStr: string) => {
    setUploadedFileName(fileName);
    setUploadedFileSize(fileSizeStr);
    setSheetNames(workbook.SheetNames);

    const firstSheetName = workbook.SheetNames[0];
    setSelectedSheet(firstSheetName);

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });

    if (jsonRows.length === 0) {
      toast.error("ไม่พบข้อมูลในชีตที่เลือก");
      setParsedRows([]);
      return;
    }

    setParsedRows(jsonRows);
    toast.success(`อ่านไฟล์ ${fileName} สำเร็จ! ตรวจพบ ${jsonRows.length} แถวข้อมูล`);
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;

    const fileSizeStr = (file.size / 1024).toFixed(1) + " KB";
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        processWorkbook(workbook, file.name, fileSizeStr);
      } catch (err: any) {
        console.error("XLSX parse error:", err);
        toast.error(`ไม่สามารถเปิดไฟล์ Excel ได้: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleImport = async () => {
    if (mode === "file") {
      if (parsedRows.length === 0) {
        toast.error("กรุณาเลือกไฟล์ Excel (.xlsx / .xls) ก่อนนำเข้า");
        return;
      }
    } else {
      if (!tsvText.trim()) {
        toast.error("กรุณาวางข้อมูลจาก Excel หรือ Google Sheets");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = mode === "file" ? { rows: parsedRows } : { tsvText };

      const res = await fetch("/api/lh/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
      }

      toast.success(`นำเข้าข้อมูลแปลงบ้านสำเร็จ ${data.importedCount} รายการ!`);
      setParsedRows([]);
      setUploadedFileName("");
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
LH372-02C09-150PW324T\tHouse\t90/124 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/124\tLH372\t02C09\t150PW324T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/124 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301134\t23/10/2020\t90/124 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02C09\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ`;
    setTsvText(sample);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-600" />
              นำเข้าข้อมูลแปลงบ้าน Land & Houses
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadLhPlotTemplate}
              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-7 px-2.5 gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              ดาวน์โหลดไฟล์ต้นแบบ Excel (.xlsx)
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            รองรับการอัปโหลดไฟล์ Excel (.xlsx, .xls) โดยตรง หรือวางข้อความตารางจาก Google Sheets
          </p>
        </DialogHeader>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 text-xs font-medium">
          <button
            onClick={() => setMode("file")}
            className={`py-2 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              mode === "file"
                ? "border-indigo-600 text-indigo-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            อัปโหลดไฟล์ Excel (.xlsx, .xls)
          </button>
          <button
            onClick={() => setMode("paste")}
            className={`py-2 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              mode === "paste"
                ? "border-indigo-600 text-indigo-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Table className="w-4 h-4" />
            วางข้อมูลข้อความ (Copy & Paste Text)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {mode === "file" ? (
            <div className="space-y-4">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />

              {/* Upload Dropzone */}
              {!uploadedFileName ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    รองรับไฟล์นามสกุล <strong>.xlsx, .xls</strong> หรือ <strong>.csv</strong>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700">
                    <UploadCloud className="w-4 h-4" />
                    เลือกไฟล์จากเครื่อง
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* File Info Bar */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{uploadedFileName}</div>
                        <div className="text-slate-500 text-[11px]">
                          ขนาด {uploadedFileSize} | ตรวจพบ{" "}
                          <strong className="text-emerald-700">{parsedRows.length} แปลงบ้าน</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs h-7 border-slate-300"
                      >
                        เปลี่ยนไฟล์
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedFileName("");
                          setParsedRows([]);
                        }}
                        className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  {parsedRows.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          ตัวอย่างข้อมูลที่ตรวจพบ (แสดง 5 แถวแรก):
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          รวมทั้งหมด {parsedRows.length} รายการ
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-56">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-100 border-b text-slate-600 font-semibold sticky top-0">
                            <tr>
                              <th className="p-2">#</th>
                              <th className="p-2">Plot Code (name)</th>
                              <th className="p-2">โครงการ (project)</th>
                              <th className="p-2">แปลง (land_plot)</th>
                              <th className="p-2">บ้านเลขที่</th>
                              <th className="p-2">แบบบ้าน (series)</th>
                              <th className="p-2">รหัสใบสั่งซื้อ (PO)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {parsedRows.slice(0, 5).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                                <td className="p-2 font-mono font-bold text-indigo-700">
                                  {row.name || row.plot_code || "-"}
                                </td>
                                <td className="p-2">{row.project || row.project_name || "-"}</td>
                                <td className="p-2 font-mono">{row.land_plot || "-"}</td>
                                <td className="p-2">{row.house_number || "-"}</td>
                                <td className="p-2 font-mono">{row.home_series || "-"}</td>
                                <td className="p-2 font-mono text-slate-600">
                                  {row["รหัสใบสั่งซื้อ"] || row.po_number || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">วางข้อมูลแบบ Tab-Separated (TSV):</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleInsertSample}
                  className="text-xs text-indigo-600 h-auto p-0"
                >
                  + ใส่ข้อมูลตัวอย่าง (3 แปลง)
                </Button>
              </div>

              <textarea
                value={tsvText}
                onChange={(e) => setTsvText(e.target.value)}
                placeholder="วางข้อมูลตารางที่นี่... ตัวอย่างหัวตาราง: name  type  label  house_number  account_code  land_plot  home_series  project_code  project  address  รหัสใบสั่งซื้อ..."
                rows={9}
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>

          <Button
            size="sm"
            onClick={handleImport}
            disabled={
              isSubmitting ||
              (mode === "file" && parsedRows.length === 0) ||
              (mode === "paste" && !tsvText.trim())
            }
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
                นำเข้าข้อมูลแปลงบ้าน {mode === "file" && parsedRows.length > 0 ? `(${parsedRows.length} แปลง)` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
