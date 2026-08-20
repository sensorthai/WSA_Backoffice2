"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Send,
  FileSpreadsheet,
  Receipt,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Wallet,
  Building,
  CreditCard,
  Eye,
  Layers,
  ArrowUpDown,
  Filter,
  CheckSquare,
  Square,
  Info
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface FlowAccountItem {
  id: string;
  type: "purchase" | "reimbursement";
  title: string;
  referenceNo: string;
  documentNumber: string | null;
  date: string;
  requesterName: string;
  requesterDept: string;
  vendorName: string;
  vendorAddress: string;
  vendorTaxId: string;
  purpose: string;
  amountBeforeVat: number;
  vatAmount: number;
  totalAmount: number;
  items: any[];
  receiptUrl: string | null;
  status: string;
  flowaccountDocNumber: string | null;
  flowaccountSyncedAt: string | null;
  createdAt: string;
}

export default function FlowAccountAccountingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [syncFilter, setSyncFilter] = useState("all"); // 'all' | 'pending' | 'synced'
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Sync Dialog state
  const [selectedItemForSync, setSelectedItemForSync] = useState<FlowAccountItem | null>(null);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>("1007");
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  // Detail Dialog state
  const [viewItem, setViewItem] = useState<FlowAccountItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Test Sync Dialog state
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

  // 1. Fetch FlowAccount Status & Categories
  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["flowaccount-status"],
    queryFn: async () => {
      const res = await fetch("/api/flowaccount/status");
      return res.json();
    },
    refetchInterval: 120000 // every 2 minutes
  });

  // 2. Fetch Pending/Approved Items
  const { data: items = [], isLoading: isItemsLoading, isRefetching: isItemsRefetching, refetch: refetchItems } = useQuery<FlowAccountItem[]>({
    queryKey: ["flowaccount-pending", syncFilter],
    queryFn: async () => {
      const res = await fetch(`/api/flowaccount/pending?filter=${syncFilter}`);
      if (!res.ok) throw new Error("Failed to fetch pending items");
      return res.json();
    }
  });

  // 3. Sync Single or Batch Mutation
  const syncMutation = useMutation({
    mutationFn: async (payload: { items: Array<{ id: string; type: string; systemCode?: string }> }) => {
      const res = await fetch("/api/flowaccount/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.results?.find((r: any) => !r.success)?.error || "การส่งข้อมูลล้มเหลว");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success("สร้างใบบันทึกค่าใช้จ่ายใน FlowAccount สำเร็จแล้ว!", {
        description: `สร้างเอกสารสำเร็จ ${data.results?.filter((r: any) => r.success).length || 1} รายการ`
      });
      setIsSyncDialogOpen(false);
      setSelectedItemForSync(null);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["flowaccount-pending"] });
    },
    onError: (err: any) => {
      toast.error("เกิดข้อผิดพลาดในการสร้างเอกสารใน FlowAccount", {
        description: err.message
      });
    }
  });

  // 4. Test Create Mutation
  const testCreateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/flowaccount/test-create", {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการทดสอบสร้างเอกสาร");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success("ทดสอบสร้างใบบันทึกค่าใช้จ่ายสำเร็จ!", {
        description: `เลขที่เอกสาร FlowAccount: ${data.documentSerial}`
      });
      setIsTestDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["flowaccount-pending"] });
    },
    onError: (err: any) => {
      toast.error("การทดสอบล้มเหลว", {
        description: err.message
      });
    }
  });

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchVendor = item.vendorName?.toLowerCase().includes(q);
        const matchReq = item.requesterName?.toLowerCase().includes(q);
        const matchRef = item.referenceNo?.toLowerCase().includes(q);
        const matchDoc = item.flowaccountDocNumber?.toLowerCase().includes(q);
        if (!matchTitle && !matchVendor && !matchReq && !matchRef && !matchDoc) return false;
      }
      return true;
    });
  }, [items, typeFilter, search]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = items.length;
    const pendingItems = items.filter((it) => !it.flowaccountDocNumber);
    const syncedItems = items.filter((it) => Boolean(it.flowaccountDocNumber));
    const pendingAmount = pendingItems.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0);
    const syncedAmount = syncedItems.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0);

    return {
      totalCount,
      pendingCount: pendingItems.length,
      pendingAmount,
      syncedCount: syncedItems.length,
      syncedAmount
    };
  }, [items]);

  const categories = statusData?.categories || [];

  const handleSelectAll = () => {
    const pendingIds = filteredItems.filter(it => !it.flowaccountDocNumber).map(it => it.id);
    if (selectedIds.length === pendingIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchSync = () => {
    if (selectedIds.length === 0) {
      toast.warning("กรุณาเลือกรายการที่ต้องการส่งเข้า FlowAccount อย่างน้อย 1 รายการ");
      return;
    }

    const payloadItems = selectedIds.map(id => {
      const it = items.find(x => x.id === id);
      return {
        id,
        type: it?.type || "purchase",
        systemCode: selectedCategoryCode
      };
    });

    syncMutation.mutate({ items: payloadItems });
  };

  const handleOpenSyncDialog = (item: FlowAccountItem) => {
    setSelectedItemForSync(item);
    setSelectedCategoryCode("1007"); // Default สินค้า/วัตถุดิบ/แพคเกจจิ้ง
    setIsSyncDialogOpen(true);
  };

  const handleConfirmSingleSync = () => {
    if (!selectedItemForSync) return;
    syncMutation.mutate({
      items: [
        {
          id: selectedItemForSync.id,
          type: selectedItemForSync.type,
          systemCode: selectedCategoryCode
        }
      ]
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              FlowAccount OpenAPI v1
            </Badge>
            {statusData?.success ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> เชื่อมต่อระบบสำเร็จ
              </Badge>
            ) : (
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-400/30 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-400" /> ยังไม่เชื่อมต่อ
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            จัดการใบบันทึกค่าใช้จ่าย FlowAccount
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            นำข้อมูลใบเบิกพัสดุและใบเบิกเงินสดย่อยที่ผ่านการอนุมัติ ส่งไปสร้างเป็นใบบันทึกค่าใช้จ่ายใน FlowAccount อัตโนมัติสำหรับผู้จัดการบัญชี
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTestDialogOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            ทดสอบสร้างเอกสาร
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStatus();
              refetchItems();
            }}
            disabled={isItemsRefetching}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isItemsRefetching ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ใบเบิกที่อนุมัติแล้ว</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{metrics.totalCount}</h3>
                <p className="text-xs text-slate-400 mt-0.5">รวมทั้งพัสดุและเงินสดย่อย</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 shadow-sm bg-amber-50/40 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">รอสร้างใน FlowAccount</p>
                <h3 className="text-2xl font-bold text-amber-900 mt-1">{metrics.pendingCount}</h3>
                <p className="text-xs text-amber-600 mt-0.5">
                  ยอดรวม: <span className="font-semibold">{metrics.pendingAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 shadow-sm bg-emerald-50/40 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">สร้างใน FlowAccount แล้ว</p>
                <h3 className="text-2xl font-bold text-emerald-900 mt-1">{metrics.syncedCount}</h3>
                <p className="text-xs text-emerald-600 mt-0.5">
                  ยอดรวม: <span className="font-semibold">{metrics.syncedAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">หมวดหมู่ค่าใช้จ่าย</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{categories.length}</h3>
                <p className="text-xs text-slate-400 mt-0.5">พร้อมเชื่อมผังบัญชีอัตโนมัติ</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">รายการใบเบิกและสถานะ FlowAccount</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                เลือกรายการที่ต้องการส่งข้อมูล หรือคลิกส่งรายแถวเพื่อระบุหมวดหมู่ค่าใช้จ่าย
              </CardDescription>
            </div>

            {/* Batch Action */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 animate-in fade-in-50">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-bold px-3 py-1 text-xs">
                  เลือกอยู่ {selectedIds.length} รายการ
                </Badge>
                <Button
                  onClick={handleBatchSync}
                  disabled={syncMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 shadow-sm gap-1.5"
                >
                  <Send className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  ส่งรายการที่เลือก ({selectedIds.length}) เข้า FlowAccount
                </Button>
              </div>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="ค้นหาชื่อเรื่อง, ร้านค้า, ผู้เบิก, เลขเอกสาร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="ประเภทใบเบิก" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภทใบเบิก</SelectItem>
                <SelectItem value="purchase">ใบเบิกพัสดุ/อุปกรณ์ (Purchase)</SelectItem>
                <SelectItem value="reimbursement">ใบเบิกเงินสดย่อย (Reimbursement)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="สถานะการส่ง FlowAccount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="pending">⏳ รอสร้างใน FlowAccount</SelectItem>
                <SelectItem value="synced">✅ สร้างใน FlowAccount แล้ว</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500 whitespace-nowrap">หมวดหมู่เริ่มต้น:</Label>
              <Select value={selectedCategoryCode} onValueChange={setSelectedCategoryCode}>
                <SelectTrigger className="h-9 text-xs flex-1">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {categories.map((c: any) => (
                    <SelectItem key={c.systemCode || c.categoryId} value={String(c.systemCode || c.categoryId)}>
                      {c.nameLocal || c.systemCode} ({c.debitCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isItemsLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm">กำลังโหลดข้อมูลใบเบิก...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">ไม่พบรายการใบเบิกตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-slate-400">ลองเปลี่ยนตัวกรอง หรือตรวจสอบว่ามีใบเบิกที่ได้รับอนุมัติแล้วหรือไม่</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <button
                        onClick={handleSelectAll}
                        className="text-slate-500 hover:text-slate-800 transition-colors"
                        title="เลือกทั้งหมด"
                      >
                        {selectedIds.length > 0 && selectedIds.length === filteredItems.filter(it => !it.flowaccountDocNumber).length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">วันที่ / รหัสอ้างอิง</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">ผู้ขอเบิก</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">ร้านค้า / คู่ค้า</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">รายการ / จุดประสงค์</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">ยอดก่อน VAT</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">VAT 7%</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">ยอดรวมสุทธิ</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">สลิป/ใบเสร็จ</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">สถานะ FlowAccount</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isSynced = Boolean(item.flowaccountDocNumber);
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <TableRow key={item.id} className={isSelected ? "bg-blue-50/40" : ""}>
                        <TableCell className="text-center">
                          {!isSynced ? (
                            <button
                              onClick={() => handleToggleSelect(item.id)}
                              className="text-slate-400 hover:text-blue-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {item.type === "purchase" ? (
                                <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px] px-1.5 py-0 font-bold">
                                  ใบเบิกพัสดุ
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5 py-0 font-bold">
                                  เงินสดย่อย
                                </Badge>
                              )}
                              <span className="font-mono text-xs font-bold text-slate-800">{item.referenceNo}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {item.date ? format(new Date(item.date), "dd/MM/yyyy") : "-"}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-800">{item.requesterName}</p>
                            <p className="text-[11px] text-slate-400">{item.requesterDept}</p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5 max-w-[180px]">
                            <p className="text-xs font-semibold text-slate-800 truncate" title={item.vendorName}>
                              {item.vendorName}
                            </p>
                            {item.vendorTaxId && (
                              <p className="text-[10px] text-slate-400">Tax ID: {item.vendorTaxId}</p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5 max-w-[220px]">
                            <p className="text-xs text-slate-800 font-medium truncate" title={item.title}>
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate" title={item.purpose}>
                              {item.items?.length > 0 ? `${item.items.length} รายการ: ${item.items[0]?.description || item.items[0]?.name || ''}` : item.purpose}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-right text-xs font-mono text-slate-600">
                          {Number(item.amountBeforeVat || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-right text-xs font-mono text-slate-600">
                          {Number(item.vatAmount || 0) > 0 ? (
                            <span className="text-blue-600 font-semibold">
                              {Number(item.vatAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                          {Number(item.totalAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                        </TableCell>

                        <TableCell className="text-center">
                          {item.receiptUrl ? (
                            <a
                              href={item.receiptUrl.startsWith('[') ? JSON.parse(item.receiptUrl)[0] : item.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded-md"
                            >
                              <Receipt className="w-3 h-3" />
                              ดูสลิป
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {isSynced ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 text-[11px] font-mono font-bold px-2 py-0.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {item.flowaccountDocNumber}
                              </Badge>
                              {item.flowaccountSyncedAt && (
                                <span className="text-[9px] text-slate-400">
                                  {format(new Date(item.flowaccountSyncedAt), "dd/MM HH:mm")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                              ⏳ รอส่ง FlowAccount
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setViewItem(item);
                                setIsDetailDialogOpen(true);
                              }}
                              className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                              title="ดูรายละเอียด"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {!isSynced ? (
                              <Button
                                size="sm"
                                onClick={() => handleOpenSyncDialog(item)}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-2.5 text-xs font-semibold gap-1 shadow-sm"
                              >
                                <Send className="w-3 h-3" />
                                ส่ง
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] font-normal">
                                ส่งแล้ว
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog 1: Confirm Single Sync with Category Selection */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Send className="w-5 h-5 text-blue-600" />
              ส่งข้อมูลเข้า FlowAccount
            </DialogTitle>
            <DialogDescription>
              ตรวจสอบและเลือกหมวดหมู่ค่าใช้จ่ายทางบัญชีก่อนส่งเอกสารไปยัง FlowAccount
            </DialogDescription>
          </DialogHeader>

          {selectedItemForSync && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 border border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">รหัสอ้างอิง:</span>
                  <span className="font-bold text-slate-800">{selectedItemForSync.referenceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ร้านค้า/คู่ค้า:</span>
                  <span className="font-bold text-slate-800">{selectedItemForSync.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ชื่อเรื่อง/รายละเอียด:</span>
                  <span className="text-slate-800 font-medium text-right max-w-[280px]">{selectedItemForSync.title}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                  <span className="text-slate-700">ยอดรวมสุทธิ:</span>
                  <span className="text-blue-600">{Number(selectedItemForSync.totalAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">เลือกหมวดหมู่ค่าใช้จ่ายใน FlowAccount:</Label>
                <Select value={selectedCategoryCode} onValueChange={setSelectedCategoryCode}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="เลือกหมวดหมู่ค่าใช้จ่าย" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {categories.map((c: any) => (
                      <SelectItem key={c.systemCode || c.categoryId} value={String(c.systemCode || c.categoryId)}>
                        <div className="flex flex-col text-left py-0.5">
                          <span className="font-semibold text-slate-800">{c.nameLocal || c.systemCode}</span>
                          <span className="text-[10px] text-slate-400">เดบิต: {c.debitCode} ({c.debitNameLocal}) | เครดิต: {c.creditCode}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  ระบบจะทำการผูกผังบัญชีเดบิตและเครดิตตามหมวดหมู่ที่เลือกให้อัตโนมัติ
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSyncDialogOpen(false)}
              disabled={syncMutation.isPending}
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSingleSync}
              disabled={syncMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              {syncMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  กำลังส่งข้อมูล...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  ยืนยันส่งเข้า FlowAccount
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: View Item Details */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              รายละเอียดเอกสาร {viewItem?.referenceNo}
            </DialogTitle>
            <DialogDescription>
              {viewItem?.type === "purchase" ? "ใบเบิกพัสดุและจัดซื้อ" : "ใบเบิกเงินสดย่อย"}
            </DialogDescription>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block">ผู้ขอเบิก:</span>
                  <span className="font-semibold text-slate-800">{viewItem.requesterName} ({viewItem.requesterDept})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">วันที่เอกสาร:</span>
                  <span className="font-semibold text-slate-800">{viewItem.date || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ร้านค้า / ผู้จำหน่าย:</span>
                  <span className="font-semibold text-slate-800">{viewItem.vendorName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">เลขประจำตัวผู้เสียภาษี:</span>
                  <span className="font-semibold text-slate-800">{viewItem.vendorTaxId || "-"}</span>
                </div>
                {viewItem.flowaccountDocNumber && (
                  <div className="col-span-2 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-emerald-700 font-bold block">FlowAccount Document Serial:</span>
                    <span className="font-mono text-sm font-bold text-emerald-900">{viewItem.flowaccountDocNumber}</span>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div>
                <Label className="font-bold text-slate-800 block mb-2">รายการสินค้า/ค่าใช้จ่าย ({viewItem.items?.length || 1} รายการ):</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[11px]">ลำดับ</TableHead>
                        <TableHead className="text-[11px]">รายละเอียด</TableHead>
                        <TableHead className="text-[11px] text-right">จำนวน</TableHead>
                        <TableHead className="text-[11px] text-right">ราคา/หน่วย</TableHead>
                        <TableHead className="text-[11px] text-right">รวม (บาท)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(viewItem.items && viewItem.items.length > 0 ? viewItem.items : [{ description: viewItem.title, quantity: 1, unit_price: viewItem.totalAmount, total: viewItem.totalAmount }]).map((line: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-center text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-slate-800">{line.description || line.name || viewItem.title}</TableCell>
                          <TableCell className="text-right font-mono">{line.quantity || 1}</TableCell>
                          <TableCell className="text-right font-mono">{Number(line.unit_price ?? line.price ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{Number(line.total ?? ((line.quantity || 1) * (line.unit_price ?? line.price ?? 0))).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 text-right font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>ยอดก่อนภาษีมูลค่าเพิ่ม:</span>
                  <span>{Number(viewItem.amountBeforeVat || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                  <span>{Number(viewItem.vatAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-1">
                  <span>ยอดรวมสุทธิทั้งสิ้น:</span>
                  <span>{Number(viewItem.totalAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDetailDialogOpen(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 3: Test Sync */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Sparkles className="w-5 h-5 text-amber-500" />
              ทดสอบสร้างใบบันทึกค่าใช้จ่าย
            </DialogTitle>
            <DialogDescription>
              ระบบจะจำลองการส่งข้อมูลใบเสร็จจากภาพตัวอย่าง (บริษัท อีเล็คทริค แอนด์ เคเบิล จำกัด, ยอด 1,613 บาท) ไปยัง FlowAccount
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
              <p className="font-bold">ข้อมูลที่จะใช้ทดสอบ:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>คู่ค้า: บริษัท อีเล็คทริค แอนด์ เคเบิล จำกัด</li>
                <li>รายการ: กล่องกันน้ำ, ตู้กันน้ำ, แคล้มจับท่อ, สกรูเกลียวปล่อย (7 รายการ)</li>
                <li>ยอดก่อน VAT: 1,507.48 บาท | VAT 7%: 105.52 บาท | ยอดรวม: 1,613.00 บาท</li>
                <li>หมวดหมู่: 1007 - สินค้า/วัตถุดิบ/แพคเกจจิ้ง (ผังบัญชี 51111.01 ซื้อสินค้า)</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTestDialogOpen(false)}
              disabled={testCreateMutation.isPending}
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              onClick={() => testCreateMutation.mutate()}
              disabled={testCreateMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {testCreateMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  กำลังสร้างเอกสารใน FlowAccount...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  เริ่มทดสอบสร้างเอกสาร
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
