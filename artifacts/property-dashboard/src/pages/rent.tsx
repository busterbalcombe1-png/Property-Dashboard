import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import {
  PoundSterling, AlertTriangle, CheckCircle2, Clock, Plus, Trash2,
  Edit2, X, Save, TrendingDown, Building2, FileText, Shield, ChevronDown,
  AlertCircle, Info, Circle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ────────────────────────────────────────────────────────────────────

type Property = { id: number; address: string; monthlyRent: number; status: string };
type Tenant = { id: number; firstName: string; lastName: string; propertyId: number; leaseEnd: string };

type RentPayment = {
  id: number; propertyId: number; tenantId: number | null;
  dueDate: string; paidDate: string | null;
  amountDue: number; amountPaid: number | null;
  status: "pending" | "paid" | "partial" | "overdue";
  paymentMethod: string | null; reference: string | null; notes: string | null;
};

type RentCharge = {
  id: number; propertyId: number; tenantId: number | null;
  chargeDate: string; chargeType: string; description: string; amount: number;
  isPaid: boolean; paidDate: string | null; deductedFromDeposit: boolean; notes: string | null;
};

type Deposit = {
  id: number; propertyId: number; tenantId: number | null;
  amount: number; receivedDate: string; scheme: string; schemeReference: string | null;
  registeredDate: string | null; status: string;
  returnedAmount: number | null; returnedDate: string | null;
  deductions: number | null; deductionNotes: string | null;
  prescribedInfoSent: boolean; prescribedInfoDate: string | null; notes: string | null;
  tenantName?: string | null; propertyAddress?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
const fmtD = (d: string) => { try { return format(parseISO(d), "d MMM yyyy"); } catch { return d; } };
const api = async (url: string, opts?: RequestInit) => {
  const r = await fetch(`/api${url}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

function shortAddr(addr: string) {
  const parts = addr.split(",");
  return parts.slice(0, 2).join(",").trim();
}

// ─── Status Badges ────────────────────────────────────────────────────────────

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid":    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">Paid</Badge>;
    case "partial": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">Partial</Badge>;
    case "overdue": return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium">Overdue</Badge>;
    default:        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-medium">Pending</Badge>;
  }
}

function DepositStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "held":           return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Held</Badge>;
    case "returned":       return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Returned</Badge>;
    case "partial_return": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Part Returned</Badge>;
    case "disputed":       return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Disputed</Badge>;
    default:               return <Badge variant="outline">{status}</Badge>;
  }
}

function ChargeTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    late_fee: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    damage:   "bg-rose-500/10 text-rose-600 border-rose-500/20",
    cleaning: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    admin:    "bg-slate-500/10 text-slate-600 border-slate-200",
    legal:    "bg-red-600/10 text-red-700 border-red-500/20",
    other:    "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    late_fee:"Late Fee", damage:"Damage", cleaning:"Cleaning", admin:"Admin", legal:"Legal", other:"Other"
  };
  return <Badge className={`${map[type] ?? map.other} font-medium`}>{labels[type] ?? type}</Badge>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, variant = "default" }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const colours = {
    default: "text-primary",
    success: "text-emerald-600",
    warning: "text-amber-500",
    danger:  "text-rose-600",
  };
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className={`h-5 w-5 shrink-0 mt-1 ${colours[variant]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Property Filter ──────────────────────────────────────────────────────────

function PropertyFilter({ properties, value, onChange }: {
  properties: Property[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-56">
        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="All Properties" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Properties</SelectItem>
        {properties.map(p => (
          <SelectItem key={p.id} value={String(p.id)}>{shortAddr(p.address)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Add Payment Dialog ───────────────────────────────────────────────────────

function AddPaymentDialog({ open, onClose, properties, tenants, onSaved }: {
  open: boolean; onClose: () => void;
  properties: Property[]; tenants: Tenant[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    propertyId: "", tenantId: "", dueDate: new Date().toISOString().split("T")[0],
    paidDate: "", amountDue: "", amountPaid: "", status: "pending",
    paymentMethod: "", reference: "", notes: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const filteredTenants = tenants.filter(t => !form.propertyId || t.propertyId === parseInt(form.propertyId));

  const handleSave = async () => {
    if (!form.propertyId || !form.dueDate || !form.amountDue) {
      toast({ title: "Please fill required fields", variant: "destructive" }); return;
    }
    await api("/rent/payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: parseInt(form.propertyId),
        tenantId: form.tenantId || null,
        dueDate: form.dueDate,
        paidDate: form.paidDate || null,
        amountDue: parseFloat(form.amountDue),
        amountPaid: form.amountPaid ? parseFloat(form.amountPaid) : null,
        status: form.status,
        paymentMethod: form.paymentMethod || null,
        reference: form.reference || null,
        notes: form.notes || null,
      }),
    });
    toast({ title: "Payment added" });
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Rent Payment</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Property *</Label>
            <Select value={form.propertyId} onValueChange={v => set("propertyId", v)}>
              <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>{properties.map(p => <SelectItem key={p.id} value={String(p.id)}>{shortAddr(p.address)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Tenant</Label>
            <Select value={form.tenantId} onValueChange={v => set("tenantId", v)}>
              <SelectTrigger><SelectValue placeholder="Select tenant (optional)" /></SelectTrigger>
              <SelectContent>{filteredTenants.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Due Date *</Label>
            <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status *</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount Due (£) *</Label>
            <Input type="number" placeholder="0" value={form.amountDue} onChange={e => set("amountDue", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount Paid (£)</Label>
            <Input type="number" placeholder="0" value={form.amountPaid} onChange={e => set("amountPaid", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date Paid</Label>
            <Input type="date" value={form.paidDate} onChange={e => set("paidDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standing_order">Standing Order</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Reference</Label>
            <Input placeholder="e.g. SO-1234" value={form.reference} onChange={e => set("reference", e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Payment Dialog ──────────────────────────────────────────────────────

function EditPaymentDialog({ payment, onClose, onSaved }: {
  payment: RentPayment; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    paidDate: payment.paidDate ?? "",
    amountPaid: payment.amountPaid != null ? String(payment.amountPaid) : "",
    status: payment.status,
    paymentMethod: payment.paymentMethod ?? "",
    reference: payment.reference ?? "",
    notes: payment.notes ?? "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await api(`/rent/payments/${payment.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paidDate: form.paidDate || null,
        amountPaid: form.amountPaid ? parseFloat(form.amountPaid) : null,
        status: form.status,
        paymentMethod: form.paymentMethod || null,
        reference: form.reference || null,
        notes: form.notes || null,
      }),
    });
    toast({ title: "Payment updated" });
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Due {fmtD(payment.dueDate)}</p>
            <p className="font-semibold">{fmt(payment.amountDue)} due</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date Paid</Label>
            <Input type="date" value={form.paidDate} onChange={e => set("paidDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount Paid (£)</Label>
            <Input type="number" value={form.amountPaid} onChange={e => set("amountPaid", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standing_order">Standing Order</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Reference</Label>
            <Input placeholder="e.g. SO-1234" value={form.reference} onChange={e => set("reference", e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Charge Dialog ────────────────────────────────────────────────────────

function AddChargeDialog({ open, onClose, properties, tenants, onSaved }: {
  open: boolean; onClose: () => void;
  properties: Property[]; tenants: Tenant[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    propertyId: "", tenantId: "", chargeDate: new Date().toISOString().split("T")[0],
    chargeType: "damage", description: "", amount: "",
    isPaid: false, paidDate: "", deductedFromDeposit: false, notes: "",
  });
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const filteredTenants = tenants.filter(t => !form.propertyId || t.propertyId === parseInt(form.propertyId));

  const handleSave = async () => {
    if (!form.propertyId || !form.description || !form.amount) {
      toast({ title: "Please fill required fields", variant: "destructive" }); return;
    }
    await api("/rent/charges", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: parseInt(form.propertyId),
        tenantId: form.tenantId || null,
        chargeDate: form.chargeDate,
        chargeType: form.chargeType,
        description: form.description,
        amount: parseFloat(form.amount),
        isPaid: form.isPaid,
        paidDate: form.paidDate || null,
        deductedFromDeposit: form.deductedFromDeposit,
        notes: form.notes || null,
      }),
    });
    toast({ title: "Charge added" });
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Charge</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Property *</Label>
            <Select value={form.propertyId} onValueChange={v => set("propertyId", v)}>
              <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>{properties.map(p => <SelectItem key={p.id} value={String(p.id)}>{shortAddr(p.address)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Tenant</Label>
            <Select value={form.tenantId} onValueChange={v => set("tenantId", v)}>
              <SelectTrigger><SelectValue placeholder="Select tenant (optional)" /></SelectTrigger>
              <SelectContent>{filteredTenants.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Charge Type *</Label>
            <Select value={form.chargeType} onValueChange={v => set("chargeType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="late_fee">Late Payment Fee</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date *</Label>
            <Input type="date" value={form.chargeDate} onChange={e => set("chargeDate", e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Description *</Label>
            <Input placeholder="e.g. Damage to kitchen worktop" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount (£) *</Label>
            <Input type="number" placeholder="0" value={form.amount} onChange={e => set("amount", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date Paid</Label>
            <Input type="date" value={form.paidDate} onChange={e => set("paidDate", e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="isPaid" checked={form.isPaid} onCheckedChange={v => set("isPaid", !!v)} />
              <Label htmlFor="isPaid" className="text-sm cursor-pointer">Marked as paid</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="deposit" checked={form.deductedFromDeposit} onCheckedChange={v => set("deductedFromDeposit", !!v)} />
              <Label htmlFor="deposit" className="text-sm cursor-pointer">Deducted from deposit</Label>
            </div>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Add Charge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Deposit Dialog ───────────────────────────────────────────────────────

function AddDepositDialog({ open, onClose, properties, tenants, onSaved, editDeposit }: {
  open: boolean; onClose: () => void;
  properties: Property[]; tenants: Tenant[];
  onSaved: () => void;
  editDeposit?: Deposit | null;
}) {
  const { toast } = useToast();
  const isEdit = !!editDeposit;
  const [form, setForm] = useState({
    propertyId: editDeposit ? String(editDeposit.propertyId) : "",
    tenantId: editDeposit?.tenantId ? String(editDeposit.tenantId) : "",
    amount: editDeposit ? String(editDeposit.amount) : "",
    receivedDate: editDeposit?.receivedDate ?? new Date().toISOString().split("T")[0],
    scheme: editDeposit?.scheme ?? "DPS",
    schemeReference: editDeposit?.schemeReference ?? "",
    registeredDate: editDeposit?.registeredDate ?? "",
    status: editDeposit?.status ?? "held",
    returnedAmount: editDeposit?.returnedAmount != null ? String(editDeposit.returnedAmount) : "",
    returnedDate: editDeposit?.returnedDate ?? "",
    deductions: editDeposit?.deductions != null ? String(editDeposit.deductions) : "",
    deductionNotes: editDeposit?.deductionNotes ?? "",
    prescribedInfoSent: editDeposit?.prescribedInfoSent ?? false,
    prescribedInfoDate: editDeposit?.prescribedInfoDate ?? "",
    notes: editDeposit?.notes ?? "",
  });
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const filteredTenants = tenants.filter(t => !form.propertyId || t.propertyId === parseInt(form.propertyId));

  const handleSave = async () => {
    if (!isEdit && (!form.propertyId || !form.amount)) {
      toast({ title: "Please fill required fields", variant: "destructive" }); return;
    }
    const payload = {
      propertyId: parseInt(form.propertyId),
      tenantId: form.tenantId || null,
      amount: parseFloat(form.amount),
      receivedDate: form.receivedDate,
      scheme: form.scheme,
      schemeReference: form.schemeReference || null,
      registeredDate: form.registeredDate || null,
      status: form.status,
      returnedAmount: form.returnedAmount ? parseFloat(form.returnedAmount) : null,
      returnedDate: form.returnedDate || null,
      deductions: form.deductions ? parseFloat(form.deductions) : null,
      deductionNotes: form.deductionNotes || null,
      prescribedInfoSent: form.prescribedInfoSent,
      prescribedInfoDate: form.prescribedInfoDate || null,
      notes: form.notes || null,
    };
    if (isEdit) {
      await api(`/rent/deposits/${editDeposit!.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast({ title: "Deposit updated" });
    } else {
      await api("/rent/deposits", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast({ title: "Deposit added" });
    }
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Deposit" : "Add Deposit"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          {!isEdit && <>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Property *</Label>
              <Select value={form.propertyId} onValueChange={v => set("propertyId", v)}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>{properties.map(p => <SelectItem key={p.id} value={String(p.id)}>{shortAddr(p.address)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Tenant</Label>
              <Select value={form.tenantId} onValueChange={v => set("tenantId", v)}>
                <SelectTrigger><SelectValue placeholder="Select tenant (optional)" /></SelectTrigger>
                <SelectContent>{filteredTenants.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deposit Amount (£) *</Label>
              <Input type="number" placeholder="0" value={form.amount} onChange={e => set("amount", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date Received *</Label>
              <Input type="date" value={form.receivedDate} onChange={e => set("receivedDate", e.target.value)} />
            </div>
          </>}
          <div className="space-y-1">
            <Label className="text-xs">Protection Scheme</Label>
            <Select value={form.scheme} onValueChange={v => set("scheme", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DPS">DPS (Deposit Protection Service)</SelectItem>
                <SelectItem value="myDeposits">myDeposits</SelectItem>
                <SelectItem value="TDS">TDS (Tenancy Deposit Scheme)</SelectItem>
                <SelectItem value="Landlord">Landlord Custodial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Scheme Reference</Label>
            <Input placeholder="e.g. DEP-123456" value={form.schemeReference} onChange={e => set("schemeReference", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date Registered</Label>
            <Input type="date" value={form.registeredDate} onChange={e => set("registeredDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="held">Held</SelectItem>
                <SelectItem value="returned">Returned in Full</SelectItem>
                <SelectItem value="partial_return">Partial Return</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="pending">Pending Registration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.status === "returned" || form.status === "partial_return") && <>
            <div className="space-y-1">
              <Label className="text-xs">Returned Amount (£)</Label>
              <Input type="number" value={form.returnedAmount} onChange={e => set("returnedAmount", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Return Date</Label>
              <Input type="date" value={form.returnedDate} onChange={e => set("returnedDate", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deductions (£)</Label>
              <Input type="number" value={form.deductions} onChange={e => set("deductions", e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Deduction Notes</Label>
              <Textarea rows={2} value={form.deductionNotes} onChange={e => set("deductionNotes", e.target.value)} />
            </div>
          </>}
          <div className="col-span-2 flex items-center gap-2 bg-muted/30 rounded-lg p-3">
            <Checkbox id="piSent" checked={form.prescribedInfoSent} onCheckedChange={v => set("prescribedInfoSent", !!v)} />
            <div>
              <Label htmlFor="piSent" className="text-sm cursor-pointer font-medium">Prescribed Information sent</Label>
              <p className="text-xs text-muted-foreground">Required by law within 30 days of receiving deposit</p>
            </div>
            {form.prescribedInfoSent && (
              <Input type="date" className="ml-auto w-36 h-8 text-xs" value={form.prescribedInfoDate} onChange={e => set("prescribedInfoDate", e.target.value)} />
            )}
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEdit ? "Save Changes" : "Add Deposit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RentTracking() {
  const { isReadOnly } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [propFilter, setPropFilter] = useState("all");
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [addDepositOpen, setAddDepositOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<RentPayment | null>(null);
  const [editDeposit, setEditDeposit] = useState<Deposit | null>(null);

  const { data: properties = [], isLoading: propsLoading } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => api("/properties"),
  });
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: () => api("/tenants"),
  });

  const paymentsKey = ["rent-payments", propFilter];
  const chargesKey  = ["rent-charges",  propFilter];
  const depositsKey = ["rent-deposits", propFilter];

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<RentPayment[]>({
    queryKey: paymentsKey,
    queryFn: () => api(`/rent/payments${propFilter !== "all" ? `?propertyId=${propFilter}` : ""}`),
  });
  const { data: charges = [], isLoading: chargesLoading } = useQuery<RentCharge[]>({
    queryKey: chargesKey,
    queryFn: () => api(`/rent/charges${propFilter !== "all" ? `?propertyId=${propFilter}` : ""}`),
  });
  const { data: deposits = [], isLoading: depositsLoading } = useQuery<Deposit[]>({
    queryKey: depositsKey,
    queryFn: () => api(`/rent/deposits${propFilter !== "all" ? `?propertyId=${propFilter}` : ""}`),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["rent-payments"] });
    qc.invalidateQueries({ queryKey: ["rent-charges"] });
    qc.invalidateQueries({ queryKey: ["rent-deposits"] });
  };

  const deletePayment = async (id: number) => {
    await api(`/rent/payments/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["rent-payments"] });
    toast({ title: "Payment deleted" });
  };

  const deleteCharge = async (id: number) => {
    await api(`/rent/charges/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["rent-charges"] });
    toast({ title: "Charge deleted" });
  };

  const markChargePaid = async (c: RentCharge) => {
    await api(`/rent/charges/${c.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, isPaid: true, paidDate: new Date().toISOString().split("T")[0] }),
    });
    qc.invalidateQueries({ queryKey: ["rent-charges"] });
    toast({ title: "Charge marked as paid" });
  };

  const deleteDeposit = async (id: number) => {
    await api(`/rent/deposits/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["rent-deposits"] });
    toast({ title: "Deposit record deleted" });
  };

  // ─── KPI Calculations ───────────────────────────────────────────────────────
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthPayments = payments.filter(p => p.dueDate.startsWith(currentMonth));
  const collectedThisMonth = thisMonthPayments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amountPaid ?? 0), 0);
  const outstandingThisMonth = thisMonthPayments.filter(p => p.status !== "paid").reduce((s, p) => s + (p.amountDue - (p.amountPaid ?? 0)), 0);
  const overduePayments = payments.filter(p => p.status === "overdue");
  const overdueTotal = overduePayments.reduce((s, p) => s + (p.amountDue - (p.amountPaid ?? 0)), 0);
  const unpaidCharges = charges.filter(c => !c.isPaid);
  const unpaidChargesTotal = unpaidCharges.reduce((s, c) => s + c.amount, 0);
  const heldDeposits = deposits.filter(d => d.status === "held");
  const heldDepositTotal = heldDeposits.reduce((s, d) => s + d.amount, 0);

  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, `${t.firstName} ${t.lastName}`]));

  const methodLabel: Record<string, string> = {
    standing_order: "Standing Order", bank_transfer: "Bank Transfer",
    cash: "Cash", cheque: "Cheque", other: "Other",
  };

  if (propsLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Rent Accounts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track rent payments, charges, and tenancy deposits</p>
          </div>
          <div className="flex-1" />
          <PropertyFilter properties={properties} value={propFilter} onChange={setPropFilter} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Collected This Month" value={fmt(collectedThisMonth)} sub={`${thisMonthPayments.filter(p => p.status === "paid").length} of ${thisMonthPayments.length} payments`} icon={CheckCircle2} variant="success" />
          <KpiCard label="Outstanding" value={fmt(outstandingThisMonth)} sub="This month" icon={Clock} variant={outstandingThisMonth > 0 ? "warning" : "default"} />
          <KpiCard label="Overdue" value={fmt(overdueTotal)} sub={`${overduePayments.length} payment${overduePayments.length !== 1 ? "s" : ""} overdue`} icon={AlertTriangle} variant={overdueTotal > 0 ? "danger" : "default"} />
          <KpiCard label="Deposits Held" value={fmt(heldDepositTotal)} sub={`${heldDeposits.length} active deposit${heldDeposits.length !== 1 ? "s" : ""}`} icon={Shield} variant="default" />
        </div>

        {/* Alerts */}
        {overduePayments.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                {overduePayments.length} overdue payment{overduePayments.length > 1 ? "s" : ""} — {fmt(overdueTotal)} outstanding
              </p>
              <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-0.5">
                {overduePayments.map(p => shortAddr(propMap[p.propertyId]?.address ?? "")).join(", ")}
              </p>
            </div>
          </div>
        )}
        {unpaidCharges.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <span className="font-semibold">{unpaidCharges.length} unpaid charge{unpaidCharges.length > 1 ? "s" : ""}</span> — {fmt(unpaidChargesTotal)} awaiting collection
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="ledger">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="ledger" className="flex-1 sm:flex-none">
              Rent Ledger
              {overduePayments.length > 0 && <span className="ml-2 bg-rose-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{overduePayments.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="charges" className="flex-1 sm:flex-none">
              Charges &amp; Expenses
              {unpaidCharges.length > 0 && <span className="ml-2 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{unpaidCharges.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="deposits" className="flex-1 sm:flex-none">Deposits</TabsTrigger>
          </TabsList>

          {/* ── Rent Ledger Tab ── */}
          <TabsContent value="ledger" className="mt-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Rent Ledger</CardTitle>
                {!isReadOnly && <Button size="sm" onClick={() => setAddPaymentOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Add Payment
                </Button>}
              </CardHeader>
              <CardContent className="p-0">
                {paymentsLoading ? <div className="p-6"><Skeleton className="h-48 w-full" /></div>
                  : payments.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
                      <PoundSterling className="h-10 w-10 opacity-20" />
                      <p className="text-sm">No rent payments recorded yet.</p>
                      <Button size="sm" variant="outline" onClick={() => setAddPaymentOpen(true)}>Add first payment</Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/20">
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Property</th>
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Tenant</th>
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Due Date</th>
                            <th className="text-right py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Due</th>
                            <th className="text-right py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Paid</th>
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Method</th>
                            <th className="py-2.5 px-4"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map(p => (
                            <tr key={p.id} className="border-b border-border/30 hover:bg-muted/10">
                              <td className="py-3 px-4 font-medium max-w-[160px] truncate">
                                {shortAddr(propMap[p.propertyId]?.address ?? `Property ${p.propertyId}`)}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {p.tenantId ? tenantMap[p.tenantId] ?? "—" : "—"}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{fmtD(p.dueDate)}</td>
                              <td className="py-3 px-4 text-right font-medium">{fmt(p.amountDue)}</td>
                              <td className="py-3 px-4 text-right">
                                {p.amountPaid != null
                                  ? <span className={p.amountPaid < p.amountDue ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>{fmt(p.amountPaid)}</span>
                                  : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="py-3 px-4"><PaymentStatusBadge status={p.status} /></td>
                              <td className="py-3 px-4 text-muted-foreground text-xs">
                                {p.paymentMethod ? methodLabel[p.paymentMethod] ?? p.paymentMethod : "—"}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1 justify-end">
                                  {p.notes && (
                                    <span title={p.notes} className="cursor-help">
                                      <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                                    </span>
                                  )}
                                  {!isReadOnly && <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditPayment(p)}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400/60 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => deletePayment(p.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                  </>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Charges Tab ── */}
          <TabsContent value="charges" className="mt-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Charges &amp; Expenses</CardTitle>
                {!isReadOnly && <Button size="sm" onClick={() => setAddChargeOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Add Charge
                </Button>}
              </CardHeader>
              <CardContent className="p-0">
                {chargesLoading ? <div className="p-6"><Skeleton className="h-48 w-full" /></div>
                  : charges.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
                      <TrendingDown className="h-10 w-10 opacity-20" />
                      <p className="text-sm">No charges recorded.</p>
                      <Button size="sm" variant="outline" onClick={() => setAddChargeOpen(true)}>Add charge</Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/20">
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Property</th>
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Description</th>
                            <th className="text-right py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Amount</th>
                            <th className="text-left py-2.5 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="py-2.5 px-4"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {charges.map(c => (
                            <tr key={c.id} className="border-b border-border/30 hover:bg-muted/10">
                              <td className="py-3 px-4 font-medium max-w-[140px] truncate">
                                {shortAddr(propMap[c.propertyId]?.address ?? `Property ${c.propertyId}`)}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{fmtD(c.chargeDate)}</td>
                              <td className="py-3 px-4"><ChargeTypeBadge type={c.chargeType} /></td>
                              <td className="py-3 px-4 max-w-[200px]">
                                <span className="block truncate">{c.description}</span>
                                {c.deductedFromDeposit && <span className="text-xs text-purple-600">From deposit</span>}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold">{fmt(c.amount)}</td>
                              <td className="py-3 px-4">
                                {c.isPaid
                                  ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid{c.paidDate ? ` ${fmtD(c.paidDate)}` : ""}</Badge>
                                  : <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Unpaid</Badge>}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1 justify-end">
                                  {c.notes && <span title={c.notes} className="cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground/50" /></span>}
                                  {!c.isPaid && !isReadOnly && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600/60 hover:text-emerald-600" onClick={() => markChargePaid(c)} title="Mark paid">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {!isReadOnly && <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400/60 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => deleteCharge(c.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="border-t border-border/50 px-4 py-3 flex justify-end gap-6 text-sm">
                        <span className="text-muted-foreground">Total charges: <span className="font-semibold text-foreground">{fmt(charges.reduce((s,c)=>s+c.amount,0))}</span></span>
                        <span className="text-muted-foreground">Outstanding: <span className="font-semibold text-amber-600">{fmt(unpaidChargesTotal)}</span></span>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Deposits Tab ── */}
          <TabsContent value="deposits" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg px-4 py-3 flex items-center gap-3 flex-1 mr-4">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    UK law requires deposits to be protected within <strong>30 days</strong> of receipt and Prescribed Information sent to the tenant.
                    Maximum deposit is <strong>5 weeks' rent</strong>.
                  </p>
                </div>
                {!isReadOnly && <Button size="sm" onClick={() => setAddDepositOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Add Deposit
                </Button>}
              </div>

              {depositsLoading ? <Skeleton className="h-48 w-full" />
                : deposits.length === 0 ? (
                  <Card className="border-border/50 shadow-sm">
                    <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
                      <Shield className="h-10 w-10 opacity-20" />
                      <p className="text-sm">No deposits recorded.</p>
                      <Button size="sm" variant="outline" onClick={() => setAddDepositOpen(true)}>Add deposit</Button>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {deposits.map(d => {
                      const prop = propMap[d.propertyId];
                      const fiveWeeks = prop ? (prop.monthlyRent * 12 / 52) * 5 : null;
                      const overLimit = fiveWeeks && d.amount > fiveWeeks;
                      const piNeeded = !d.prescribedInfoSent;
                      return (
                        <Card key={d.id} className="border-border/50 shadow-sm">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap mb-1">
                                  <h3 className="font-semibold text-sm">{d.propertyAddress ? shortAddr(d.propertyAddress) : `Property ${d.propertyId}`}</h3>
                                  <DepositStatusBadge status={d.status} />
                                  {piNeeded && <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">PI Not Sent</Badge>}
                                  {overLimit && <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">Exceeds 5-week limit</Badge>}
                                </div>
                                {d.tenantName && <p className="text-xs text-muted-foreground mb-3">{d.tenantName}</p>}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Deposit</p>
                                    <p className="font-bold text-base">{fmt(d.amount)}</p>
                                    {fiveWeeks && <p className="text-xs text-muted-foreground">Max: {fmt(fiveWeeks)}</p>}
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Scheme</p>
                                    <p className="font-medium">{d.scheme}</p>
                                    {d.schemeReference && <p className="text-xs text-muted-foreground font-mono">{d.schemeReference}</p>}
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Received</p>
                                    <p className="font-medium">{fmtD(d.receivedDate)}</p>
                                    {d.registeredDate && <p className="text-xs text-muted-foreground">Reg: {fmtD(d.registeredDate)}</p>}
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Prescribed Info</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {d.prescribedInfoSent
                                        ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /><span className="text-xs text-emerald-600 font-medium">Sent {d.prescribedInfoDate ? fmtD(d.prescribedInfoDate) : ""}</span></>
                                        : <><AlertTriangle className="h-3.5 w-3.5 text-rose-600" /><span className="text-xs text-rose-600 font-medium">Not sent</span></>}
                                    </div>
                                  </div>
                                  {d.deductions != null && (
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Deductions</p>
                                      <p className="font-medium text-rose-600">{fmt(d.deductions)}</p>
                                      {d.deductionNotes && <p className="text-xs text-muted-foreground">{d.deductionNotes}</p>}
                                    </div>
                                  )}
                                  {d.returnedAmount != null && (
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Returned</p>
                                      <p className="font-medium text-emerald-600">{fmt(d.returnedAmount)}</p>
                                      {d.returnedDate && <p className="text-xs text-muted-foreground">{fmtD(d.returnedDate)}</p>}
                                    </div>
                                  )}
                                </div>
                                {d.notes && <p className="text-xs text-muted-foreground mt-3 italic">"{d.notes}"</p>}
                              </div>
                              {!isReadOnly && <div className="flex gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setEditDeposit(d)}>
                                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400/60 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => deleteDeposit(d.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AddPaymentDialog open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} properties={properties} tenants={tenants} onSaved={invalidateAll} />
      {editPayment && <EditPaymentDialog payment={editPayment} onClose={() => setEditPayment(null)} onSaved={invalidateAll} />}
      <AddChargeDialog open={addChargeOpen} onClose={() => setAddChargeOpen(false)} properties={properties} tenants={tenants} onSaved={invalidateAll} />
      <AddDepositDialog open={addDepositOpen} onClose={() => setAddDepositOpen(false)} properties={properties} tenants={tenants} onSaved={invalidateAll} />
      {editDeposit && <AddDepositDialog open onClose={() => setEditDeposit(null)} properties={properties} tenants={tenants} onSaved={invalidateAll} editDeposit={editDeposit} />}
    </AppLayout>
  );
}
