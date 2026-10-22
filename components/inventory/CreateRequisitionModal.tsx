"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { PackageCheck, Loader2, Search, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReq: any) => void;
}

export function CreateRequisitionModal({ isOpen, onClose, onSuccess }: CreateRequisitionModalProps) {
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [requesterName, setRequesterName] = useState<string>("");
  const [requesterPhone, setRequesterPhone] = useState<string>("");
  const [purposeType, setPurposeType] = useState<string>("installation_new");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch pending plots
  const { data: plotsData } = useQuery({
    queryKey: ["pending-plots-req"],
    queryFn: async () => {
      const res = await fetch("/api/lh/plots?status=pending&limit=100");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isOpen,
  });

  // Fetch in-stock devices
  const { data: devicesData } = useQuery({
    queryKey: ["available-devices"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/devices?status=in_stock");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const pendingPlots = plotsData?.plots || [];
  const availableDevices = Array.isArray(devicesData) ? devicesData : [];

  const handleAddDevice = (deviceId: string) => {
    if (!deviceId) return;
    if (selectedDeviceIds.includes(deviceId)) {
      toast.warning("อุปกรณ์นี้ถูกเลือกแล้ว");
      return;
    }
    setSelectedDeviceIds((prev) => [...prev, deviceId]);
  };

  const handleRemoveDevice = (deviceId: string) => {
    setSelectedDeviceIds((prev) => prev.filter((id) => id !== deviceId));
  };

  const handleSubmit = async () => {
    if (!selectedPlotId) {
      toast.error("กรุณาเลือกแปลงบ้าน");
      return;
    }
    if (!requesterName.trim()) {
      toast.error("กรุณาระบุชื่อผู้ขอเบิก");
      return;
    }
    if (selectedDeviceIds.length === 0) {
      toast.error("กรุณาเลือกอุปกรณ์ที่ต้องการเบิกอย่างน้อย 1 ชิ้น");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/inventory/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot_id: selectedPlotId,
          requester_name: requesterName,
          requester_phone: requesterPhone,
          purpose_type: purposeType,
          device_ids: selectedDeviceIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการสร้างใบเบิก");

      toast.success("สร้างใบเบิกอุปกรณ์และตัดสต็อกสำเร็จ!");
      onSuccess(data.requisition);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-indigo-600" />
            สร้างใบเบิกอุปกรณ์ออกจากคลัง (New Equipment Requisition)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Destination Plot Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              1. เลือกแปลงบ้าน Land & Houses ปลายทางที่จะนำไปติดตั้ง:
            </label>
            <select
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- เลือกแปลงบ้าน (โครงการ / แปลง / บ้านเลขที่) --</option>
              {pendingPlots.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.project?.project_name || p.project?.project_code} | แปลง {p.land_plot} (บ้านเลขที่: {p.house_number || "-"}) [แบบ: {p.home_series}]
                </option>
              ))}
            </select>
          </div>

          {/* Requester Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">ชื่อผู้ขอเบิก (ช่าง/พนักงาน):</label>
              <Input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="เช่น นายสมชาย ช่างทอง"
                className="text-xs h-9 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">เบอร์โทรศัพท์ติดต่อ:</label>
              <Input
                type="text"
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="text-xs h-9 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">วัตถุประสงค์ในการเบิก:</label>
              <select
                value={purposeType}
                onChange={(e) => setPurposeType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md p-2 h-9 mt-1 bg-white"
              >
                <option value="installation_new">ติดตั้งโครงการใหม่</option>
                <option value="warranty_replace">เปลี่ยนทดแทนในประกัน</option>
                <option value="out_of_warranty_refurbished">เปลี่ยนทดแทนเกินประกัน (อุปกรณ์ซ่อม)</option>
                <option value="office_testing">ทดสอบ / ใช้งานภายใน</option>
              </select>
            </div>
          </div>

          {/* Device Selection & Scanning */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                2. เลือกอุปกรณ์ตาม Serial Number (S/N) ที่จะจ่ายออก:
              </label>
              <span className="text-[11px] text-slate-500">
                เลือกแล้ว {selectedDeviceIds.length} ชิ้น
              </span>
            </div>

            <div className="flex gap-2">
              <select
                id="device-select"
                className="flex-1 text-xs border border-slate-300 rounded-md p-2 bg-white"
                defaultValue=""
                onChange={(e) => {
                  handleAddDevice(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">-- เลือก Serial Number จากคลังที่พร้อมใช้งาน --</option>
                {availableDevices
                  .filter((d: any) => !selectedDeviceIds.includes(d.id))
                  .map((d: any) => (
                    <option key={d.id} value={d.id}>
                      [{d.product?.sku}] S/N: {d.serial_number} — {d.product?.name} ({d.ownership_type === "customer_consignment" ? "ของลูกค้าฝาก LH" : "ของบริษัท"} / {d.condition === "repaired_refurbished" ? "ซ่อมแล้ว" : "ใหม่"})
                    </option>
                  ))}
              </select>
            </div>

            {/* Selected Devices List */}
            <div className="border rounded-md divide-y max-h-48 overflow-y-auto bg-slate-50">
              {selectedDeviceIds.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  ยังไม่ได้เลือกอุปกรณ์ กรุณาเลือกจากรายการด้านบน
                </div>
              ) : (
                selectedDeviceIds.map((devId) => {
                  const dev = availableDevices.find((d: any) => d.id === devId);
                  return (
                    <div key={devId} className="flex items-center justify-between p-2 text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 mr-2">{dev?.serial_number}</span>
                        <span className="text-slate-600 font-medium">{dev?.product?.name}</span>
                        <span className="ml-2 text-[10px] text-slate-500">
                          ({dev?.ownership_type === "customer_consignment" ? "สต็อกฝาก LH" : "สต็อกบริษัท"} / {dev?.condition === "repaired_refurbished" ? "ของซ่อม" : "ของใหม่"})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDevice(devId)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
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
            disabled={isSubmitting || !selectedPlotId || selectedDeviceIds.length === 0}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <PackageCheck className="w-4 h-4" />
                บันทึกและตัดสต็อก (พิมพ์ใบเบิก)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
