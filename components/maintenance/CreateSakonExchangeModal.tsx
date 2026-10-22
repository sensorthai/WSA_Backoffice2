"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import {
  FileUp,
  Plus,
  Trash2,
  Loader2,
  FileCheck,
  CheckCircle2,
  Camera,
  Upload,
  FileText,
  Eye,
  X,
  Sparkles,
  Bot,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface CreateSakonExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newExchange: any) => void;
}

export function CreateSakonExchangeModal({ isOpen, onClose, onSuccess }: CreateSakonExchangeModalProps) {
  const [sakolDocNo, setSakolDocNo] = useState("");
  const [sakolDocDate, setSakolDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileUrl, setAttachedFileUrl] = useState("");
  const [attachedFileType, setAttachedFileType] = useState<"image" | "pdf" | "">("");
  const [receivedBy, setReceivedBy] = useState("ตัวแทน บริษัท สากลเวิร์ค จำกัด");
  const [issuedBy, setIssuedBy] = useState("เจ้าหน้าที่คลัง WSA");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanSuccess, setAiScanSuccess] = useState(false);

  // Hidden inputs for file upload and camera
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Dynamic exchange items
  const [items, setItems] = useState<Array<{
    product_sku: string;
    product_name: string;
    quantity: number;
    defect_notes: string;
    refurbished_sn: string;
    refurbished_device_id?: string;
  }>>([
    {
      product_sku: "AP-CTRL",
      product_name: 'Controller " Airplus "',
      quantity: 1,
      defect_notes: "",
      refurbished_sn: "",
    },
  ]);

  // Fetch available Refurbished devices from DB
  const { data: devicesData } = useQuery({
    queryKey: ["refurbished-devices-exchange"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/devices?condition=repaired_refurbished&status=in_stock");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isOpen,
  });

  const availableRefurbished = Array.isArray(devicesData) ? devicesData : [];

  const runAiScan = async (dataUrl: string, name: string, mime: string) => {
    try {
      setIsAiScanning(true);
      setAiScanSuccess(false);

      const res = await fetch("/api/maintenance/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          filename: name,
          mimeType: mime,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI ไม่สามารถอ่านข้อมูลได้");

      if (data.extracted) {
        const ext = data.extracted;
        if (ext.sakol_doc_no) setSakolDocNo(ext.sakol_doc_no);
        if (ext.sakol_doc_date) setSakolDocDate(ext.sakol_doc_date);
        if (ext.received_by) setReceivedBy(ext.received_by);
        if (ext.notes) setNotes(ext.notes);

        if (Array.isArray(ext.items) && ext.items.length > 0) {
          setItems(
            ext.items.map((i: any) => ({
              product_sku: i.product_sku || "AP-CTRL",
              product_name: i.product_name || 'Controller " Airplus "',
              quantity: Number(i.quantity) || 1,
              defect_notes: i.defect_notes || "",
              refurbished_sn: i.refurbished_sn || "",
              refurbished_device_id: i.refurbished_device_id,
            }))
          );
        }

        setAiScanSuccess(true);
        toast.success(`✨ AI อ่านเอกสารสำเร็จ! ตรวจพบ ${ext.items?.length || 0} รายการ และกรอกข้อมูลให้อัตโนมัติ`);
      }
    } catch (err: any) {
      console.error("AI Scan Error:", err);
      toast.error(`AI อ่านเอกสารไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsAiScanning(false);
    }
  };

  if (!isOpen) return null;

  const handleProcessFile = (file?: File) => {
    if (!file) return;

    setAttachedFileName(file.name);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const mime = isPdf ? "application/pdf" : file.type || "image/jpeg";
    setAttachedFileType(isPdf ? "pdf" : "image");

    // Read as Data URL for persistent storage, preview, and AI processing
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      setAttachedFileUrl(result);
      toast.success(`แนบเอกสาร: ${file.name} เรียบร้อยแล้ว`);

      // Trigger AI reading immediately
      await runAiScan(result, file.name, mime);
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_sku: "AP-CTRL",
        product_name: 'Controller " Airplus "',
        quantity: 1,
        defect_notes: "",
        refurbished_sn: "",
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      (copy[idx] as any)[field] = value;

      if (field === "product_sku") {
        if (value === "AP-CTRL") copy[idx].product_name = 'Controller " Airplus "';
        if (value === "AP-8PORT") copy[idx].product_name = 'Air Plus 8 Port Extension';
        if (value === "SN-PM25") copy[idx].product_name = 'Sensor';
      }

      if (field === "refurbished_sn") {
        const found = availableRefurbished.find((d: any) => d.serial_number === value);
        copy[idx].refurbished_device_id = found?.id;
      }

      return copy;
    });
  };

  const handleSetSampleDoc = (docType: string) => {
    if (docType === "C030") {
      setSakolDocNo("LHSAV-SQ-6707-C030");
      setSakolDocDate("2024-07-06");
      setItems([
        {
          product_sku: "AP-CTRL",
          product_name: 'Controller " Airplus "',
          quantity: 18,
          defect_notes: "- MMK2 140/54 สั่งให้พัดลมทำงานไม่ได้, - C15 234/286 ไฟ LED ไม่ติด",
          refurbished_sn: "APC-WSA-RF-0001",
        },
        {
          product_sku: "AP-CTRL",
          product_name: 'Controller " PM2.5 "',
          quantity: 1,
          defect_notes: "- C69 195/29 ไฟ LED ไม่ติด/ระบบไม่ทำงาน",
          refurbished_sn: "APC-WSA-RF-0002",
        },
        {
          product_sku: "SN-PM25",
          product_name: "Sensor",
          quantity: 2,
          defect_notes: "- VR2 45/114 Sensor ในค่าสูง",
          refurbished_sn: "SN-WSA-NEW-0001",
        },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!sakolDocNo.trim()) {
      toast.error("กรุณาระบุเลขที่ใบขอเปลี่ยนของสากลเวิร์ค");
      return;
    }
    if (items.length === 0) {
      toast.error("กรุณาระบุรายการอุปกรณ์อย่างน้อย 1 รายการ");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/maintenance/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sakol_doc_no: sakolDocNo,
          sakol_doc_date: sakolDocDate,
          partner_name: "บริษัท สากลเวิร์ค จำกัด",
          pdf_file_url: attachedFileUrl,
          pdf_filename: attachedFileName,
          received_by: receivedBy,
          issued_by: issuedBy,
          notes,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");

      toast.success("บันทึกการเปลี่ยนอุปกรณ์และเปิดใบเซ็นรับของเรียบร้อยแล้ว!");
      onSuccess(data.exchange);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-indigo-600" />
            บันทึกรับอุปกรณ์เสีย & เบิกจ่าย Refurbished ให้ สากลเวิร์ค (Sakon)
          </DialogTitle>
          <p className="text-xs text-slate-500">
            ถ่ายรูปเอกสารหรืออัปโหลดไฟล์ (JPG, PNG, PDF) พร้อมเลือก S/N Refurbished แล้วพิมพ์ใบเซ็นรับของ
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Quick Sample Button */}
          <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
            <span className="text-indigo-900 font-medium">โหลดข้อมูลตัวอย่างจากเอกสารจริงของ Sakon:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSetSampleDoc("C030")}
              className="text-xs h-7 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
            >
              + ตัวอย่างใบขอเปลี่ยน LHSAV-SQ-6707-C030
            </Button>
          </div>

          {/* Section 1: Sakon Document Meta & Camera / File Upload */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="font-bold text-xs text-slate-900">
              1. แนบเอกสารใบขอเปลี่ยน (ถ่ายรูปจากกล้อง หรือ อัปโหลด JPG, PNG, PDF):
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleProcessFile(e.target.files?.[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => handleProcessFile(e.target.files?.[0])}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                className="gap-2 text-xs bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
              >
                <Camera className="w-4 h-4 text-indigo-600" />
                ถ่ายรูปเอกสารจากกล้อง
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                อัปโหลดไฟล์ (JPG, PNG, PDF)
              </Button>

              {attachedFileName && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 font-medium">
                  <span>✓ แนบแล้ว: {attachedFileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFileName("");
                      setAttachedFileUrl("");
                      setAttachedFileType("");
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {attachedFileName && !isAiScanning && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    runAiScan(
                      attachedFileUrl,
                      attachedFileName,
                      attachedFileType === "pdf" ? "application/pdf" : "image/jpeg"
                    )
                  }
                  className="gap-1.5 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 h-8"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  ให้ AI วิเคราะห์เอกสารอีกครั้ง
                </Button>
              )}
            </div>

            {/* AI Scanning Status Banner */}
            {isAiScanning && (
              <div className="p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-lg flex items-center gap-3 animate-pulse">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-spin" />
                <div>
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <span>กำลังให้ AI อ่านเอกสารใบขอเปลี่ยนของ สากลเวิร์ค...</span>
                  </div>
                  <div className="text-[11px] text-indigo-700">
                    AI กำลังตรวจจับเลขที่เอกสาร, วันที่, รายการอุปกรณ์ที่เสีย, อาการเสีย และจับคู่ S/N Refurbished ให้ทันที
                  </div>
                </div>
              </div>
            )}

            {/* AI Scan Success Banner */}
            {aiScanSuccess && !isAiScanning && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    <strong>AI อ่านเอกสารสำเร็จ:</strong> ตรวจพบ {items.length} รายการ พร้อมกรอกข้อมูลและเลือก S/N Refurbished ให้ครบถ้วน
                  </span>
                </div>
              </div>
            )}

            {/* Attachment Preview (If photo captured / uploaded) */}
            {attachedFileUrl && attachedFileType === "image" && (
              <div className="mt-2 p-2 bg-white border border-slate-300 rounded-lg max-w-sm">
                <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                  <span>ตัวอย่างรูปถ่ายเอกสาร:</span>
                  <span className="text-[10px] text-emerald-600">พร้อมแนบ</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachedFileUrl}
                  alt="Captured Doc"
                  className="w-full max-h-48 object-contain rounded border border-slate-200"
                />
              </div>
            )}

            {/* Document Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t text-xs">
              <div>
                <label className="font-semibold text-slate-800">เลขที่ใบขอเปลี่ยน (ของ Sakon):</label>
                <Input
                  type="text"
                  placeholder="เช่น LHSAV-SQ-6707-C030"
                  value={sakolDocNo}
                  onChange={(e) => setSakolDocNo(e.target.value)}
                  className="text-xs h-9 mt-1 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-800">วันที่ตามเอกสารของ Sakon:</label>
                <Input
                  type="date"
                  value={sakolDocDate}
                  onChange={(e) => setSakolDocDate(e.target.value)}
                  className="text-xs h-9 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Items to Exchange */}
          <div className="space-y-2 border-t pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                2. รายการอุปกรณ์ที่ขอเปลี่ยน & จ่ายตัว Refurbished ทดแทน:
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่มรายการ
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-xs shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-3">
                      <span className="text-[11px] font-semibold text-slate-600">ประเภทอุปกรณ์:</span>
                      <select
                        value={item.product_sku}
                        onChange={(e) => handleItemChange(idx, "product_sku", e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white mt-0.5"
                      >
                        <option value="AP-CTRL">Controller &quot; Airplus &quot;</option>
                        <option value="AP-8PORT">Air Plus 8 Port Extension</option>
                        <option value="SN-PM25">Sensor PM 2.5</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-[11px] font-semibold text-slate-600">จำนวน (ชิ้น):</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        className="text-xs h-8 mt-0.5 font-bold"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <span className="text-[11px] font-semibold text-slate-600">เลือก S/N Refurbished ที่จะจ่าย:</span>
                      <select
                        value={item.refurbished_sn}
                        onChange={(e) => handleItemChange(idx, "refurbished_sn", e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white mt-0.5 font-mono"
                      >
                        <option value="">-- เลือก Serial Number จากคลัง Refurbished --</option>
                        {availableRefurbished.map((d: any) => (
                          <option key={d.id} value={d.serial_number}>
                            {d.serial_number} ({d.owner_company_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-[11px] font-semibold text-slate-600">หรือพิมพ์ S/N:</span>
                      <Input
                        type="text"
                        placeholder="S/N จ่ายออก"
                        value={item.refurbished_sn}
                        onChange={(e) => handleItemChange(idx, "refurbished_sn", e.target.value)}
                        className="text-xs h-8 mt-0.5 font-mono"
                      />
                    </div>

                    <div className="md:col-span-1 text-right pt-4">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-600">อาการเสียและแปลงบ้าน (จากเอกสารของ Sakon):</span>
                    <Input
                      type="text"
                      placeholder="เช่น - MMK2 140/54 สั่งให้พัดลมทำงานไม่ได้, ไฟ LED ไม่ติด..."
                      value={item.defect_notes}
                      onChange={(e) => handleItemChange(idx, "defect_notes", e.target.value)}
                      className="text-xs h-8 mt-0.5 text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Signatures Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t text-xs">
            <div>
              <label className="font-semibold text-slate-800">ผู้รับอุปกรณ์ (ตัวแทน สากลเวิร์ค):</label>
              <Input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="text-xs h-9 mt-1"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-800">ผู้ให้เบิกอุปกรณ์ (เจ้าหน้าที่คลัง):</label>
              <Input
                type="text"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                className="text-xs h-9 mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t flex justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !sakolDocNo.trim()}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                บันทึก & สร้างใบเซ็นรับของ (A4)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
