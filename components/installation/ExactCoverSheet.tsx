"use client";

import React from "react";
import { getCustomerCompanyInfo } from "@/lib/lh-customer";

export interface PlotCoverSheetData {
  plot_code: string;
  land_plot: string;
  house_number?: string;
  home_series: string;
  full_address?: string;
  po_number?: string;
  project?: {
    account_code: string;
    project_code: string;
    project_name: string;
  };
  technician_name?: string;
  technician_phone?: string;
}

interface ExactCoverSheetProps {
  plot: PlotCoverSheetData;
  onPrint?: () => void;
}

export function ExactCoverSheet({ plot }: ExactCoverSheetProps) {
  const accountCode = plot.project?.account_code || "";
  const customerInfo = getCustomerCompanyInfo(accountCode);
  const projectName = plot.project?.project_name || "";
  const houseNumber = plot.house_number || "";
  const address = plot.full_address || "";
  const landPlot = plot.land_plot || "";
  const homeSeries = plot.home_series || "";
  const poNumber = plot.po_number || "";

  return (
    <div className="bg-white text-black p-8 max-w-[210mm] mx-auto border border-slate-300 shadow-sm print:p-0 print:border-none print:shadow-none font-sans text-[13px] leading-relaxed">
      {/* Yip In Tsoi Corporate Header Banner */}
      <div className="mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/yipintsoi-header.png"
          alt="YIP IN TSOI Header"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Title */}
      <div className="text-center font-bold text-base mb-6">
        เอกสารส่งมอบงานติดตั้ง/ใบส่งสินค้า
      </div>

      {/* Header Info Block */}
      <div className="space-y-1 mb-4">
        <div className="flex">
          <span className="w-24 font-bold shrink-0">โครงการ</span>
          <span className="mr-2">:</span>
          <span>ซื้อขายชุดควบคุมกระแสไฟฟ้า (Air Plus Controller)</span>
        </div>
        <div className="flex">
          <span className="w-24 font-bold shrink-0">ชื่อลูกค้า</span>
          <span className="mr-2">:</span>
          <span className="font-semibold">{customerInfo.companyName}</span>
        </div>
        <div className="flex items-start">
          <span className="w-24 font-bold shrink-0">ที่อยู่</span>
          <span className="mr-2">:</span>
          <span>{customerInfo.headOfficeAddress}</span>
        </div>
        <div className="pt-2">
          <span>ชื่อหมู่บ้าน:</span>
          <span className="ml-2 font-semibold">โครงการ …{projectName}…</span>
        </div>
        <div>
          <span>บ้านเลขที่ …{houseNumber} {address}…</span>
        </div>
        <div className="flex flex-wrap gap-x-4">
          <span>แปลงที่...{landPlot}…</span>
          <span>แบบบ้าน…{homeSeries}…</span>
          <span>ใบสั่งซื้อเลขที่...{poNumber || "................................................................."}...</span>
        </div>
      </div>

      {/* Table: รายการส่งมอบงานติดตั้ง */}
      <div className="mb-4">
        <div className="font-bold mb-1">รายการส่งมอบงานติดตั้ง</div>
        <table className="w-full border-collapse border border-black text-center text-xs">
          <thead>
            <tr className="bg-slate-100 print:bg-transparent">
              <th className="border border-black p-1.5 w-16">ลำดับ</th>
              <th className="border border-black p-1.5 text-left pl-4">รายละเอียด</th>
              <th className="border border-black p-1.5 w-28">จำนวน(ชุด)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1">1</td>
              <td className="border border-black p-1 text-left pl-4">ชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5</td>
              <td className="border border-black p-1">1</td>
            </tr>
            <tr>
              <td className="border border-black p-1">2</td>
              <td className="border border-black p-1 text-left pl-4">Air Plus 8 Port Extension</td>
              <td className="border border-black p-1">1</td>
            </tr>
            <tr>
              <td className="border border-black p-1">3</td>
              <td className="border border-black p-1 text-left pl-4">เซ็นเซอร์</td>
              <td className="border border-black p-1">2</td>
            </tr>
            <tr>
              <td className="border border-black p-1">4</td>
              <td className="border border-black p-1 text-left pl-4">คู่มือการใช้งาน</td>
              <td className="border border-black p-1">1</td>
            </tr>
            <tr>
              <td className="border border-black p-1">5</td>
              <td className="border border-black p-1 text-left pl-4">ใบรับประกัน</td>
              <td className="border border-black p-1">1</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Checklist: ผลการติดตั้งอุปกรณ์ชุดควบคุมกระแสไฟฟ้า */}
      <div className="mb-4 space-y-1">
        <div className="font-bold">ผลการติดตั้งอุปกรณ์ชุดควบคุมกระแสไฟฟ้า (Air Plus Controller)</div>
        <div className="pl-6 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-black"></span>
            <span>ไฟแสดงสถานะติดครบ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-black"></span>
            <span>ทดสอบการเชื่อมต่อ Application กับชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-black"></span>
            <span>ทดสอบการเชื่อมต่อ Application กับ Air Plus Square Extension</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-black"></span>
            <span>สามารถรับค่า PM2.5 จาก sensor 1 ที่ ห้องนั่งเล่น</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-black"></span>
            <span>สามารถรับค่า PM2.5 จาก sensor 2 ที่ โรงจอดรถ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-black"></span>
            <span>สั่งเปิด-ปิดพัดลมกรองอากาศได้</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-black"></span>
            <span>สั่งเปิด-ปิดพัดลม Air Plus จำนวน ……… เครื่องได้</span>
          </div>
        </div>
      </div>

      {/* Post-work Inspection Checklist */}
      <div className="mb-4 text-xs space-y-0.5">
        <div className="font-semibold">
          ตรวจสอบหลังจบงาน : 1. ควรขยับ Marker ออกจากรางเก็บ สายเพื่อให้มองเห็นง่าย
        </div>
        <div className="pl-28">
          2. ตรวจสอบสัญญาณสาย LAN ………………………………
        </div>
        <div className="pl-28">
          3. หัวน็อตปิดตู้ Controller หากหลวมให้รีบแจ้งโครงการแก้ไข
        </div>
        <div className="pt-1">
          หมายเหตุ: ……………………………………………………………………………………………………………
        </div>
        <div className="pl-14">
          ……………………………………………………………………………………………………………
        </div>
      </div>

      {/* Signatures */}
      <div className="pt-4 border-t border-dashed border-slate-300">
        <div className="grid grid-cols-2 gap-8 text-center">
          <div>
            <div>ลงชื่อ……………………………………. ผู้ติดตั้ง</div>
            <div className="mt-1">( {plot.technician_name || "                            "} )</div>
            <div className="mt-2">วันที่…………../……………………./………</div>
            <div className="mt-2">เบอร์โทร…{plot.technician_phone || "…………………………………."}</div>
          </div>
          <div>
            <div>ลงชื่อ……………………………. ผู้ตรวจรับ</div>
            <div className="mt-1">(                                       )</div>
            <div className="mt-2">วันที่…………../……………………./………</div>
            <div className="mt-2">เบอร์โทร…………………………………….</div>
            <div className="mt-3 text-right font-medium text-xs pr-4">
              พร้อมประทับตราโครงการ
            </div>
          </div>
        </div>
      </div>

      {/* Yip In Tsoi Corporate Footer */}
      <div className="mt-8 pt-3 border-t border-black text-center text-[10.5px] text-slate-800 font-sans tracking-tight print:mt-6">
        523 Mahaprutharam Road Bangrak Bangkok 10500 Tel.(662)353-8600 Fax. (662) 359-9683 http://www.yipintsoi.com
      </div>
    </div>
  );
}
