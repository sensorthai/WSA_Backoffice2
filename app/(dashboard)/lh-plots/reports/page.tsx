"use client";

import React from "react";
import { LhSummaryReport } from "@/components/installation/LhSummaryReport";
import Link from "next/link";
import { ArrowLeft, Home, Building2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LhReportsPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/lh-plots" className="hover:text-indigo-600 flex items-center gap-1 font-medium">
            <Building2 className="w-3.5 h-3.5" />
            งานติดตั้ง & โครงการ LH
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">รายงานสรุป Lot & โครงการ</span>
        </div>

        <Link href="/lh-plots">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <ArrowLeft className="w-3.5 h-3.5" />
            กลับหน้ารายการแปลงบ้าน
          </Button>
        </Link>
      </div>

      {/* Render Summary Reports */}
      <LhSummaryReport />
    </div>
  );
}
