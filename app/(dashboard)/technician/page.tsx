"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  CheckCircle2,
  Camera,
  MapPin,
  ExternalLink,
  Users,
  Building,
  Home,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export default function TechnicianHandoverPage() {
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [leadTechName, setLeadTechName] = useState<string>("นายสมชาย ช่างทอง");
  const [partnerTechName, setPartnerTechName] = useState<string>("");
  const [isDuo, setIsDuo] = useState<boolean>(false);

  // 9 Checklist Items
  const [ledStatusOk, setLedStatusOk] = useState(true);
  const [appControllerOk, setAppControllerOk] = useState(true);
  const [appExtOk, setAppExtOk] = useState(true);
  const [sensor1Ok, setSensor1Ok] = useState(true);
  const [sensor2Ok, setSensor2Ok] = useState(true);
  const [fanFilterOk, setFanFilterOk] = useState(true);
  const [fanAirplusCount, setFanAirplusCount] = useState<number>(2);
  const [markerCableOk, setMarkerCableOk] = useState(true);
  const [controllerScrewTight, setControllerScrewTight] = useState(true);
  const [technicianNotes, setTechnicianNotes] = useState("");

  // Customer sign info
  const [customerSignName, setCustomerSignName] = useState("");
  const [customerSignPhone, setCustomerSignPhone] = useState("");

  // 5 Photo URLs (or base64 / mock upload)
  const [photoController, setPhotoController] = useState("");
  const [photoSensor1, setPhotoSensor1] = useState("");
  const [photoSensor2, setPhotoSensor2] = useState("");
  const [photoApp, setPhotoApp] = useState("");
  const [photoSignedSheet, setPhotoSignedSheet] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch pending plots
  const { data: plotsData, refetch } = useQuery({
    queryKey: ["pending-tech-plots"],
    queryFn: async () => {
      const res = await fetch("/api/lh/plots?status=pending&limit=100");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const plots = plotsData?.plots || [];
  const selectedPlot = plots.find((p: any) => p.id === selectedPlotId);

  const handlePhotoUploadMock = (setter: (url: string) => void) => {
    // Mock image capture / file picker
    const fakeUrl = `https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60`;
    setter(fakeUrl);
    toast.success("บันทึกรูปถ่ายเรียบร้อยแล้ว");
  };

  const handleSubmit = async () => {
    if (!selectedPlotId) {
      toast.error("กรุณาเลือกแปลงบ้านที่ต้องการส่งงาน");
      return;
    }
    if (!leadTechName.trim()) {
      toast.error("กรุณาระบุชื่อช่างผู้ติดตั้ง");
      return;
    }

    const techNames = [leadTechName.trim()];
    if (isDuo && partnerTechName.trim()) {
      techNames.push(partnerTechName.trim());
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/installation/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot_id: selectedPlotId,
          technician_names: techNames,
          lead_technician_name: leadTechName,
          led_status_ok: ledStatusOk,
          app_connect_controller_ok: appControllerOk,
          app_connect_ext_ok: appExtOk,
          sensor1_living_room_ok: sensor1Ok,
          sensor2_garage_ok: sensor2Ok,
          fan_filter_control_ok: fanFilterOk,
          fan_airplus_count: fanAirplusCount,
          marker_cable_ok: markerCableOk,
          controller_screw_tight: controllerScrewTight,
          technician_notes: technicianNotes,
          customer_sign_name: customerSignName,
          customer_sign_phone: customerSignPhone,
          photo_controller_led: photoController || "https://example.com/photos/led.jpg",
          photo_sensor_living_room: photoSensor1 || "https://example.com/photos/sensor1.jpg",
          photo_sensor_garage: photoSensor2 || "https://example.com/photos/sensor2.jpg",
          photo_app_screen: photoApp || "https://example.com/photos/app.jpg",
          photo_signed_sheet: photoSignedSheet || "https://example.com/photos/signed.jpg",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งงาน");

      toast.success(
        `ส่งมอบงานแปลง ${selectedPlot?.land_plot} สำเร็จ! ค่าคอมมิชชั่นถูกบันทึกเรียบร้อย (${isDuo ? "แบ่งคนละ ฿25.00" : "฿50.00 เต็มจำนวน"})`
      );
      setSelectedPlotId("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-700">
          <Wrench className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            ระบบส่งมอบงานติดตั้งหน้างาน (Technician Handover)
          </h1>
          <p className="text-xs text-slate-500">
            ตรวจสอบรายการตามใบปะหน้าจริง, แนบรูปถ่าย 5 จุด และบันทึกค่าคอมมิชชั่นเข้ากระเป๋า
          </p>
        </div>
      </div>

      {/* Step 1: Select Plot */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <Home className="w-4 h-4 text-indigo-600" />
          1. เลือกแปลงบ้านที่ทำการติดตั้ง:
        </label>
        <select
          value={selectedPlotId}
          onChange={(e) => setSelectedPlotId(e.target.value)}
          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
        >
          <option value="">-- เลือกแปลงบ้าน (แปลงที่ / โครงการ / บ้านเลขที่) --</option>
          {plots.map((p: any) => (
            <option key={p.id} value={p.id}>
              แปลง {p.land_plot} | {p.project?.project_name} (บ้านเลขที่: {p.house_number || "-"}) [แบบ: {p.home_series}]
            </option>
          ))}
        </select>

        {selectedPlot && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 animate-in fade-in">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>{selectedPlot.project?.project_name}</span>
              <Badge variant="outline" className="text-[10px] bg-white">
                แบบ {selectedPlot.home_series}
              </Badge>
            </div>
            <div className="text-slate-600">
              <strong>ที่อยู่หน้างาน:</strong> {selectedPlot.full_address || "-"}
            </div>
            <div className="text-slate-600 flex justify-between">
              <span><strong>เลขที่ใบสั่งซื้อ (PO):</strong> {selectedPlot.po_number || "-"}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  selectedPlot.full_address || selectedPlot.project?.project_name
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline"
              >
                <MapPin className="w-3.5 h-3.5" />
                เปิดแผนที่นำทาง
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Technicians & Commission Setup */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          2. ช่างผู้ปฏิบัติงาน & การแบ่งค่าคอมมิชชั่น:
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-slate-600 font-medium">ชื่อช่างหลัก:</span>
            <Input
              type="text"
              value={leadTechName}
              onChange={(e) => setLeadTechName(e.target.value)}
              className="text-xs h-9 mt-1 font-semibold"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mt-1 mb-1">
              <span className="text-[11px] text-slate-600 font-medium">มีช่างร่วมงานหรือไม่?</span>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDuo}
                  onChange={(e) => setIsDuo(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-indigo-700">เข้าทำ 2 คน (หาร 2)</span>
              </label>
            </div>
            {isDuo && (
              <Input
                type="text"
                placeholder="ระบุชื่อช่างคนที่ 2..."
                value={partnerTechName}
                onChange={(e) => setPartnerTechName(e.target.value)}
                className="text-xs h-9"
              />
            )}
          </div>
        </div>

        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between">
          <span>อัตราค่าคอมมิชชั่นแปลงนี้:</span>
          <strong>
            {isDuo ? "แบ่งคนละ ฿25.00 (รวม ฿50.00)" : "รับเต็มคนเดียว ฿50.00"}
          </strong>
        </div>
      </div>

      {/* Step 3: Installation Checklist (ตามใบปะหน้าจริง) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          3. ผลการทดสอบอุปกรณ์ชุดควบคุมกระแสไฟฟ้า (ตามใบปะหน้าจริง):
        </label>

        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
            <input
              type="checkbox"
              checked={ledStatusOk}
              onChange={(e) => setLedStatusOk(e.target.checked)}
              className="rounded text-indigo-600 w-4 h-4"
            />
            <span>ไฟแสดงสถานะติดครบ</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
            <input
              type="checkbox"
              checked={appControllerOk}
              onChange={(e) => setAppControllerOk(e.target.checked)}
              className="rounded text-indigo-600 w-4 h-4"
            />
            <span>ทดสอบการเชื่อมต่อ Application กับชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
            <input
              type="checkbox"
              checked={appExtOk}
              onChange={(e) => setAppExtOk(e.target.checked)}
              className="rounded text-indigo-600 w-4 h-4"
            />
            <span>ทดสอบการเชื่อมต่อ Application กับ Air Plus Square Extension</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
            <input
              type="checkbox"
              checked={sensor1Ok}
              onChange={(e) => setSensor1Ok(e.target.checked)}
              className="rounded text-indigo-600 w-4 h-4"
            />
            <span>สามารถรับค่า PM2.5 จาก sensor 1 ที่ ห้องนั่งเล่น</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
            <input
              type="checkbox"
              checked={sensor2Ok}
              onChange={(e) => setSensor2Ok(e.target.checked)}
              className="rounded text-indigo-600 w-4 h-4"
            />
            <span>สามารถรับค่า PM2.5 จาก sensor 2 ที่ โรงจอดรถ</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
            <input
              type="checkbox"
              checked={fanFilterOk}
              onChange={(e) => setFanFilterOk(e.target.checked)}
              className="rounded text-indigo-600 w-4 h-4"
            />
            <span>สั่งเปิด-ปิดพัดลมกรองอากาศได้</span>
          </label>
          <div className="flex items-center gap-2 p-2">
            <span>สั่งเปิด-ปิดพัดลม Air Plus จำนวน</span>
            <input
              type="number"
              value={fanAirplusCount}
              onChange={(e) => setFanAirplusCount(Number(e.target.value))}
              className="w-16 border rounded p-1 text-center font-bold"
            />
            <span>เครื่องได้</span>
          </div>
        </div>

        <div className="pt-2 border-t text-xs space-y-1.5">
          <div className="font-semibold text-slate-800">ตรวจสอบหลังจบงาน:</div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={markerCableOk}
              onChange={(e) => setMarkerCableOk(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>1. ขยับ Marker ออกจากรางเก็บสายเพื่อให้มองเห็นง่าย</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={controllerScrewTight}
              onChange={(e) => setControllerScrewTight(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>3. หัวน็อตปิดตู้ Controller ขันแน่นเรียบร้อย</span>
          </label>
        </div>
      </div>

      {/* Step 4: Mandatory 5 Photo Proofs */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <Camera className="w-4 h-4 text-indigo-600" />
          4. ถ่ายรูปหลักฐานส่งงานตามจุดที่กำหนด (5 จุด):
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Photo 1 */}
          <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
            <div className="font-semibold text-slate-800">1. ไฟตู้ Air Plus Controller</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePhotoUploadMock(setPhotoController)}
              className="w-full text-xs gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {photoController ? "✓ ถ่ายแล้ว (ถ่ายใหม่)" : "กดถ่ายรูป"}
            </Button>
          </div>

          {/* Photo 2 */}
          <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
            <div className="font-semibold text-slate-800">2. เซ็นเซอร์ 1 (ห้องนั่งเล่น)</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePhotoUploadMock(setPhotoSensor1)}
              className="w-full text-xs gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {photoSensor1 ? "✓ ถ่ายแล้ว (ถ่ายใหม่)" : "กดถ่ายรูป"}
            </Button>
          </div>

          {/* Photo 3 */}
          <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
            <div className="font-semibold text-slate-800">3. เซ็นเซอร์ 2 (โรงจอดรถ)</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePhotoUploadMock(setPhotoSensor2)}
              className="w-full text-xs gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {photoSensor2 ? "✓ ถ่ายแล้ว (ถ่ายใหม่)" : "กดถ่ายรูป"}
            </Button>
          </div>

          {/* Photo 4 */}
          <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
            <div className="font-semibold text-slate-800">4. หน้าจอ App อ่านค่า PM2.5</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePhotoUploadMock(setPhotoApp)}
              className="w-full text-xs gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {photoApp ? "✓ ถ่ายแล้ว (ถ่ายใหม่)" : "กดถ่ายรูป"}
            </Button>
          </div>

          {/* Photo 5 */}
          <div className="p-3 border rounded-lg bg-slate-50 space-y-2 sm:col-span-2 border-indigo-200 bg-indigo-50/40">
            <div className="font-bold text-indigo-950 flex items-center justify-between">
              <span>5. ใบปะหน้าที่มีลายเซ็นผู้ตรวจรับ + ประทับตราโครงการ</span>
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePhotoUploadMock(setPhotoSignedSheet)}
              className="w-full text-xs gap-1.5 border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50"
            >
              <Camera className="w-3.5 h-3.5" />
              {photoSignedSheet ? "✓ ถ่ายใบปะหน้าเรียบร้อยแล้ว" : "กดถ่ายรูปใบปะหน้าที่ลงนามแล้ว"}
            </Button>
          </div>
        </div>
      </div>

      {/* Step 5: Sign & Submit */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-900">
          5. ข้อมูลผู้ตรวจรับหน้างาน (Land & Houses):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="text"
            placeholder="ชื่อผู้ตรวจรับของโครงการ..."
            value={customerSignName}
            onChange={(e) => setCustomerSignName(e.target.value)}
            className="text-xs h-9"
          />
          <Input
            type="text"
            placeholder="เบอร์โทรผู้ตรวจรับ..."
            value={customerSignPhone}
            onChange={(e) => setCustomerSignPhone(e.target.value)}
            className="text-xs h-9"
          />
        </div>

        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedPlotId}
          className="w-full gap-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md mt-4"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังส่งมอบงาน...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              บันทึกส่งมอบงานสำเร็จ (ปิดงาน & รับค่าคอมมิชชั่น)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
