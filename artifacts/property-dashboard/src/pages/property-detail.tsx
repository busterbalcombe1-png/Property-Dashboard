import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { format, differenceInMonths, differenceInYears } from "date-fns";
import {
  ArrowLeft, Upload, Home, ExternalLink, Edit2, Save, X, Plus, Trash2,
  Building2, Key, Shield, Users, Wrench, TrendingUp, PoundSterling,
  Phone, Mail, Calendar, Info, Link, Camera
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getListPropertiesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const fmt = (val?: number) =>
  val == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(val);
const fmtPct = (val?: number) =>
  val == null ? "—" : `${val.toFixed(2)}%`;

type PropDetail = {
  id: number; address: string; propertyType: string; bedrooms: number; bathrooms?: number;
  yearBuilt?: number; epcRating?: string; councilTaxBand?: string; purchasePrice: number;
  currentValue: number; monthlyRent: number; monthlyMortgage: number; monthlyExpenses: number;
  status: string; purchaseDate: string; mortgageLender?: string; mortgageRate?: number;
  mortgageType?: string; mortgageTermYears?: number; mortgageFixEndDate?: string; mortgageBalance?: number;
  photoUrl?: string; rightmoveUrl?: string; zooplaUrl?: string; landRegistryUrl?: string;
  lettingAgent?: string; lettingAgentPhone?: string; lettingAgentEmail?: string; lettingAgentFee?: number;
  solicitor?: string; solicitorPhone?: string; insuranceProvider?: string;
  insuranceRenewalDate?: string; notes?: string; createdAt: string; updatedAt: string;
};

type Valuation = {
  id: number; propertyId: number; valuationDate: string;
  value: number; source: string; notes?: string; createdAt: string;
};

type Tradesperson = {
  id: number; propertyId: number; tradeType: string; name: string;
  company?: string; phone?: string; email?: string; notes?: string; createdAt: string;
};

const TRADE_TYPES = [
  "Boiler Engineer", "Builder", "Carpenter", "Electrician", "Gardener",
  "Gas Engineer", "Handyman", "Locksmith", "Painter & Decorator",
  "Plumber", "Roofer", "Window Cleaner", "Other",
];

const TRADE_COLORS: Record<string, string> = {
  "Boiler Engineer":    "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Builder":            "bg-stone-500/10 text-stone-600 border-stone-500/20",
  "Carpenter":          "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "Electrician":        "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Gardener":           "bg-green-500/10 text-green-700 border-green-500/20",
  "Gas Engineer":       "bg-red-500/10 text-red-600 border-red-500/20",
  "Handyman":           "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Locksmith":          "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "Painter & Decorator":"bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Plumber":            "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  "Roofer":             "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "Window Cleaner":     "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "Other":              "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "occupied": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Occupied</Badge>;
    case "vacant":   return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Vacant</Badge>;
    case "maintenance": return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Maintenance</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function EpcBadge({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-sm text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    A: "bg-green-600", B: "bg-green-500", C: "bg-lime-500",
    D: "bg-yellow-500", E: "bg-orange-500", F: "bg-orange-600", G: "bg-red-600",
  };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded font-bold text-white text-sm ${colors[rating] ?? "bg-gray-400"}`}>
      {rating}
    </span>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
    <div>{children}</div>
  </div>
);

export default function PropertyDetail() {
  const { isReadOnly } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const propertyId = parseInt(id ?? "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: property, isLoading, refetch } = useQuery<PropDetail>({
    queryKey: ["property", propertyId],
    queryFn: () => fetch(`/api/properties/${propertyId}`).then(r => r.json()),
    enabled: !!propertyId,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PropDetail>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [valuations, setValuations] = useState<Valuation[] | null>(null);
  const [valuationsLoading, setValuationsLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    setValuationsLoading(true);
    fetch(`/api/properties/${propertyId}/valuations`)
      .then(r => r.json())
      .then(data => setValuations(data))
      .finally(() => setValuationsLoading(false));
  }, [propertyId]);

  const [showAddVal, setShowAddVal] = useState(false);
  const [newVal, setNewVal] = useState({
    valuationDate: new Date().toISOString().split("T")[0],
    value: "", source: "Estate Agent Estimate", notes: "",
  });

  const startEdit = () => {
    if (!property) return;
    setEditData({ ...property });
    setIsEditing(true);
  };

  const cancelEdit = () => { setIsEditing(false); setEditData({}); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...property, ...editData }),
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
      setIsEditing(false);
      setEditData({});
      toast({ title: "Property saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("photo", file);
    try {
      const res = await fetch(`/api/properties/${propertyId}/photo`, { method: "POST", body: form });
      const data = await res.json();
      await refetch();
      if (isEditing) setEditData(prev => ({ ...prev, photoUrl: data.photoUrl }));
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const addValuation = async () => {
    if (!newVal.value) return;
    const res = await fetch(`/api/properties/${propertyId}/valuations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valuationDate: newVal.valuationDate, value: parseFloat(newVal.value), source: newVal.source, notes: newVal.notes || undefined }),
    });
    const data = await res.json();
    setValuations(prev => [...(prev ?? []), data]);
    setShowAddVal(false);
    setNewVal({ valuationDate: new Date().toISOString().split("T")[0], value: "", source: "Estate Agent Estimate", notes: "" });
    toast({ title: "Valuation added" });
  };

  const deleteValuation = async (vid: number) => {
    await fetch(`/api/properties/${propertyId}/valuations/${vid}`, { method: "DELETE" });
    setValuations(prev => (prev ?? []).filter(v => v.id !== vid));
  };

  const [tradespeople, setTradespeople] = useState<Tradesperson[] | null>(null);
  const [tradespeopleLoading, setTradespeopleLoading] = useState(false);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({ tradeType: "Plumber", name: "", company: "", phone: "", email: "", notes: "" });

  useEffect(() => {
    if (!propertyId) return;
    setTradespeopleLoading(true);
    fetch(`/api/properties/${propertyId}/tradespeople`)
      .then(r => r.json())
      .then(data => setTradespeople(data))
      .finally(() => setTradespeopleLoading(false));
  }, [propertyId]);

  const addTradesperson = async () => {
    if (!newTrade.name.trim()) return;
    const res = await fetch(`/api/properties/${propertyId}/tradespeople`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tradeType: newTrade.tradeType,
        name:      newTrade.name,
        company:   newTrade.company  || undefined,
        phone:     newTrade.phone    || undefined,
        email:     newTrade.email    || undefined,
        notes:     newTrade.notes    || undefined,
      }),
    });
    const data = await res.json();
    setTradespeople(prev => [...(prev ?? []), data].sort((a, b) => a.tradeType.localeCompare(b.tradeType)));
    setShowAddTrade(false);
    setNewTrade({ tradeType: "Plumber", name: "", company: "", phone: "", email: "", notes: "" });
    toast({ title: "Tradesperson added" });
  };

  const deleteTradesperson = async (tid: number) => {
    await fetch(`/api/properties/${propertyId}/tradespeople/${tid}`, { method: "DELETE" });
    setTradespeople(prev => (prev ?? []).filter(t => t.id !== tid));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Home className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Property not found.</p>
          <Button variant="outline" onClick={() => navigate("/properties")}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </div>
      </AppLayout>
    );
  }

  const p: PropDetail = isEditing ? { ...property, ...editData } : property;
  const lettingAgentCost = p.lettingAgent && p.lettingAgentFee ? (p.monthlyRent * p.lettingAgentFee) / 100 : 0;
  const cashflow = p.monthlyRent - p.monthlyMortgage - p.monthlyExpenses - lettingAgentCost;
  const capitalGain = p.currentValue - p.purchasePrice;
  const capitalGainPct = (capitalGain / p.purchasePrice) * 100;
  const grossYield = (p.monthlyRent * 12 / p.currentValue) * 100;
  const netYield = (cashflow * 12 / p.currentValue) * 100;
  const mortgageBalance = p.mortgageBalance ?? 0;
  const equity = p.currentValue - mortgageBalance;
  const ltv = mortgageBalance > 0 ? (mortgageBalance / p.currentValue) * 100 : 0;
  const purchaseDate = p.purchaseDate ? new Date(p.purchaseDate) : null;
  const yearsHeld = purchaseDate ? differenceInYears(new Date(), purchaseDate) : 0;
  const monthsHeld = purchaseDate ? differenceInMonths(new Date(), purchaseDate) % 12 : 0;

  const setField = (field: keyof PropDetail, val: unknown) =>
    setEditData(prev => ({ ...prev, [field]: val }));

  const EF = (field: keyof PropDetail, type: "text" | "number" | "date" | "textarea" = "text") => {
    const raw = editData[field] ?? property[field] ?? "";
    const value = String(raw ?? "");
    if (type === "textarea") return (
      <Textarea className="text-sm" rows={3} value={value}
        onChange={e => setField(field, e.target.value)} />
    );
    return (
      <Input className="h-8 text-sm" type={type} value={value}
        onChange={e => setField(field, type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)} />
    );
  };

  const RV = (field: keyof PropDetail) => {
    const v = p[field];
    if (v == null || v === "") return <span className="text-sm text-muted-foreground">—</span>;
    return <span className="text-sm font-medium">{String(v)}</span>;
  };

  const valChartData = [
    { date: p.purchaseDate, value: p.purchasePrice },
    ...(valuations ?? []).map(v => ({ date: v.valuationDate, value: v.value })),
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl pb-12">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/properties")}
            className="-ml-2 self-start text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Properties
          </Button>
          <div className="flex-1" />
          {!isReadOnly && (isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancelEdit}><X className="mr-2 h-4 w-4" />Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={startEdit}><Edit2 className="mr-2 h-4 w-4" />Edit Property</Button>
          ))}
        </div>

        {/* Address + thumbnail */}
        <div className="flex items-center gap-5">
          {/* Left: address info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              <h1 className="text-3xl md:text-4xl font-bold">{p.address}</h1>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {p.propertyType} · {p.bedrooms} bed{p.bathrooms ? ` · ${p.bathrooms} bath` : ""}
              {purchaseDate && ` · Purchased ${format(purchaseDate, "MMM yyyy")}`}
              {(yearsHeld > 0 || monthsHeld > 0) && ` (${yearsHeld > 0 ? `${yearsHeld}y ` : ""}${monthsHeld}m ago)`}
            </p>
          </div>

          {/* Right: photo thumbnail — click or hover to change */}
          <div
            className="shrink-0 relative overflow-hidden rounded-lg cursor-pointer"
            style={{ width: 250, aspectRatio: "4/3", background: "#0c1220" }}
            onClick={() => !isReadOnly && fileInputRef.current?.click()}
            title={isReadOnly ? "" : uploading ? "Uploading…" : p.photoUrl ? "Change photo" : "Upload photo"}
          >
            {p.photoUrl ? (
              <>
                <img
                  src={p.photoUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-25 pointer-events-none select-none"
                />
                <img
                  src={p.photoUrl}
                  alt={p.address}
                  className="relative z-10 w-full h-full object-contain"
                />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground/40">
                <Camera className="h-7 w-7" />
                <span className="text-[10px] tracking-wide">Add photo</span>
              </div>
            )}
            {/* Hover overlay — only for admin */}
            {!isReadOnly && <div className="absolute inset-0 z-20 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <Upload className="h-5 w-5 text-white drop-shadow" />
            </div>}
            {!isReadOnly && <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Current Value", value: fmt(p.currentValue), sub: `${capitalGain >= 0 ? "+" : ""}${fmt(capitalGain)}`, pos: capitalGain >= 0 },
            { label: "Purchase Price", value: fmt(p.purchasePrice), sub: p.purchaseDate ? format(new Date(p.purchaseDate), "d MMM yyyy") : undefined },
            { label: "Equity", value: fmt(equity), sub: mortgageBalance > 0 ? `LTV ${ltv.toFixed(0)}%` : "No mortgage tracked" },
            { label: "Monthly Cashflow", value: fmt(cashflow), sub: `${fmt(cashflow * 12)}/yr`, pos: cashflow >= 0 },
            { label: "Gross Yield", value: fmtPct(grossYield), sub: `Net ${fmtPct(netYield)}` },
            { label: "Monthly Rent", value: fmt(p.monthlyRent), sub: `${fmt(p.monthlyRent * 12)}/yr` },
          ].map(({ label, value, sub, pos }) => (
            <Card key={label} className="border-border/50 shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold mt-0.5">{value}</p>
                {sub && <p className={`text-xs mt-0.5 ${pos === true ? "text-emerald-600" : pos === false ? "text-rose-600" : "text-muted-foreground"}`}>{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: main detail sections */}
          <div className="lg:col-span-2 space-y-6">

            {/* Property Details */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <Field label="Property Type">{isEditing ? EF("propertyType") : RV("propertyType")}</Field>
                  <Field label="Bedrooms">{isEditing ? EF("bedrooms", "number") : RV("bedrooms")}</Field>
                  <Field label="Bathrooms">{isEditing ? EF("bathrooms", "number") : RV("bathrooms")}</Field>
                  <Field label="Year Built">{isEditing ? EF("yearBuilt", "number") : RV("yearBuilt")}</Field>
                  <Field label="EPC Rating">
                    {isEditing ? (
                      <Select value={String(editData.epcRating ?? property.epcRating ?? "")} onValueChange={v => setField("epcRating", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{["A","B","C","D","E","F","G"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <EpcBadge rating={p.epcRating} />}
                  </Field>
                  <Field label="Council Tax Band">
                    {isEditing ? (
                      <Select value={String(editData.councilTaxBand ?? property.councilTaxBand ?? "")} onValueChange={v => setField("councilTaxBand", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{["A","B","C","D","E","F","G","H"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : RV("councilTaxBand")}
                  </Field>
                  <Field label="Status">
                    {isEditing ? (
                      <Select value={String(editData.status ?? property.status)} onValueChange={v => setField("status", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="vacant">Vacant</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <StatusBadge status={p.status} />}
                  </Field>
                  <Field label="Purchase Date">{isEditing ? EF("purchaseDate", "date") : <span className="text-sm font-medium">{p.purchaseDate ? format(new Date(p.purchaseDate), "d MMM yyyy") : "—"}</span>}</Field>
                </div>
              </CardContent>
            </Card>

            {/* Financials */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><PoundSterling className="h-4 w-4 text-muted-foreground" />Financial Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mb-4">
                  <Field label="Purchase Price">{isEditing ? EF("purchasePrice", "number") : <span className="text-sm font-medium">{fmt(p.purchasePrice)}</span>}</Field>
                  <Field label="Current Value">{isEditing ? EF("currentValue", "number") : <span className="text-sm font-medium">{fmt(p.currentValue)}</span>}</Field>
                  <Field label="Capital Growth">
                    <span className={`text-sm font-semibold ${capitalGain >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {capitalGain >= 0 ? "+" : ""}{fmt(capitalGain)} ({capitalGainPct >= 0 ? "+" : ""}{capitalGainPct.toFixed(1)}%)
                    </span>
                  </Field>
                </div>
                <Separator className="my-3" />
                <div className={`grid gap-x-6 gap-y-4 ${p.lettingAgent ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
                  <Field label="Monthly Rent">{isEditing ? EF("monthlyRent", "number") : <span className="text-sm font-medium">{fmt(p.monthlyRent)}</span>}</Field>
                  <Field label="Monthly Mortgage">{isEditing ? EF("monthlyMortgage", "number") : <span className="text-sm font-medium">{fmt(p.monthlyMortgage)}</span>}</Field>
                  <Field label="Other Expenses">{isEditing ? EF("monthlyExpenses", "number") : <span className="text-sm font-medium">{fmt(p.monthlyExpenses)}</span>}</Field>
                  {p.lettingAgent && (
                    <Field label={`Letting Agent Fee${p.lettingAgentFee ? ` (${p.lettingAgentFee}%)` : ""}`}>
                      <span className="text-sm font-medium text-rose-600">
                        {lettingAgentCost > 0 ? `−${fmt(lettingAgentCost)}` : "—"}
                      </span>
                    </Field>
                  )}
                  <Field label="Net Cashflow"><span className={`text-sm font-bold ${cashflow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(cashflow)}/mo</span></Field>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { l: "Annual Cashflow", v: fmt(cashflow * 12) },
                    { l: "Gross Yield", v: fmtPct(grossYield) },
                    { l: "Net Yield", v: fmtPct(netYield) },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-muted/40 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">{l}</p>
                      <p className="text-base font-bold mt-1">{v}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mortgage */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4 text-muted-foreground" />Mortgage Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <Field label="Lender">{isEditing ? EF("mortgageLender") : RV("mortgageLender")}</Field>
                  <Field label="Mortgage Type">
                    {isEditing ? (
                      <Select value={String(editData.mortgageType ?? property.mortgageType ?? "")} onValueChange={v => setField("mortgageType", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {["Repayment", "Interest Only", "Part & Part"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : RV("mortgageType")}
                  </Field>
                  <Field label="Interest Rate (%)">
                    {isEditing ? EF("mortgageRate", "number") : <span className="text-sm font-medium">{p.mortgageRate != null ? `${p.mortgageRate}%` : "—"}</span>}
                  </Field>
                  <Field label="Term (years)">{isEditing ? EF("mortgageTermYears", "number") : RV("mortgageTermYears")}</Field>
                  <Field label="Fix End Date">{isEditing ? EF("mortgageFixEndDate", "date") : <span className="text-sm font-medium">{p.mortgageFixEndDate ? format(new Date(p.mortgageFixEndDate), "d MMM yyyy") : "—"}</span>}</Field>
                  <Field label="Outstanding Balance">{isEditing ? EF("mortgageBalance", "number") : <span className="text-sm font-medium">{fmt(p.mortgageBalance)}</span>}</Field>
                </div>
                {p.mortgageFixEndDate && (() => {
                  const months = differenceInMonths(new Date(p.mortgageFixEndDate), new Date());
                  if (months >= 0 && months <= 3) return (
                    <div className="mt-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-sm text-amber-700 dark:text-amber-500">
                        Fix period ends <strong>{format(new Date(p.mortgageFixEndDate), "d MMM yyyy")}</strong> — {months <= 0 ? "already expired!" : `in ${months} month${months !== 1 ? "s" : ""}.`} Review your rate soon.
                      </p>
                    </div>
                  );
                  return null;
                })()}
              </CardContent>
            </Card>

            {/* Valuation History */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" />Valuation History</CardTitle>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddVal(true)}>
                      <Plus className="mr-1 h-3 w-3" />Add Valuation
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showAddVal && (
                  <div className="mb-4 p-4 border border-border/50 rounded-lg bg-muted/30 space-y-3">
                    <p className="text-sm font-semibold">New Valuation</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Date</Label>
                        <Input type="date" className="h-8 text-sm" value={newVal.valuationDate} onChange={e => setNewVal(p => ({ ...p, valuationDate: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Value (£)</Label>
                        <Input type="number" className="h-8 text-sm" placeholder="0" value={newVal.value} onChange={e => setNewVal(p => ({ ...p, value: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Source</Label>
                        <Select value={newVal.source} onValueChange={v => setNewVal(p => ({ ...p, source: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Estate Agent Estimate","RICS Surveyor","Online Tool (Zoopla)","Online Tool (Rightmove)","Land Registry","Mortgage Lender Valuation","Own Estimate"].map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Notes (optional)</Label>
                        <Input className="h-8 text-sm" value={newVal.notes} onChange={e => setNewVal(p => ({ ...p, notes: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowAddVal(false)}>Cancel</Button>
                      <Button size="sm" onClick={addValuation} disabled={!newVal.value}>Save</Button>
                    </div>
                  </div>
                )}

                {valuationsLoading ? <Skeleton className="h-48 w-full" />
                  : valuations && valuations.length > 0 ? (
                    <>
                      <div className="h-48 w-full mb-5">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={valChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => { try { return format(new Date(d), "MMM yy"); } catch { return d; } }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} width={52} />
                            <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={d => { try { return format(new Date(d), "d MMM yyyy"); } catch { return d; } }} />
                            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Value" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        {valuations.slice().reverse().map(v => (
                          <div key={v.id} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold">{fmt(v.value)}</span>
                              <span className="text-xs text-muted-foreground ml-2">{v.source}</span>
                              {v.notes && <span className="text-xs text-muted-foreground ml-2">· {v.notes}</span>}
                            </div>
                            <div className="flex items-center gap-3 ml-3 shrink-0">
                              <span className="text-xs text-muted-foreground">{format(new Date(v.valuationDate), "d MMM yyyy")}</span>
                              <button onClick={() => deleteValuation(v.id)} className="text-muted-foreground/40 hover:text-rose-500 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                      <TrendingUp className="h-8 w-8 opacity-20" />
                      <p className="text-sm">No valuations yet.{!isReadOnly && " Add one above to start tracking."}</p>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" />Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing
                  ? EF("notes", "textarea")
                  : p.notes
                    ? <p className="text-sm text-foreground whitespace-pre-wrap">{p.notes}</p>
                    : <p className="text-sm text-muted-foreground italic">No notes yet. Click Edit Property to add.</p>
                }
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: sidebar panels */}
          <div className="space-y-5">
            {/* Useful Links */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Link className="h-4 w-4 text-muted-foreground" />Useful Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  { label: "Rightmove Listing", field: "rightmoveUrl" as keyof PropDetail, icon: "🏠" },
                  { label: "Zoopla Listing",    field: "zooplaUrl" as keyof PropDetail, icon: "🔍" },
                  { label: "Land Registry",     field: "landRegistryUrl" as keyof PropDetail, icon: "📋" },
                ] as const).map(({ label, field, icon }) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">{icon} {label}</Label>
                    {isEditing ? (
                      <Input className="h-8 text-sm" placeholder="https://…"
                        value={String(editData[field] ?? property[field] ?? "")}
                        onChange={e => setField(field, e.target.value)} />
                    ) : p[field] ? (
                      <a href={String(p[field])} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline truncate">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{String(p[field]).replace(/^https?:\/\//, "")}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not set</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Letting Agent */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Letting Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Agency Name">{isEditing ? EF("lettingAgent") : RV("lettingAgent")}</Field>
                <Field label="Phone">
                  {isEditing ? EF("lettingAgentPhone") : p.lettingAgentPhone
                    ? <a href={`tel:${p.lettingAgentPhone}`} className="flex items-center gap-1.5 text-sm hover:text-primary"><Phone className="h-3.5 w-3.5" />{p.lettingAgentPhone}</a>
                    : <span className="text-sm text-muted-foreground">—</span>}
                </Field>
                <Field label="Email">
                  {isEditing ? EF("lettingAgentEmail") : p.lettingAgentEmail
                    ? <a href={`mailto:${p.lettingAgentEmail}`} className="flex items-center gap-1.5 text-sm hover:text-primary"><Mail className="h-3.5 w-3.5" />{p.lettingAgentEmail}</a>
                    : <span className="text-sm text-muted-foreground">—</span>}
                </Field>
                <Field label="Management Fee (%)">
                  {isEditing
                    ? EF("lettingAgentFee", "number")
                    : p.lettingAgentFee != null
                      ? <span className="text-sm font-medium">{p.lettingAgentFee}% <span className="text-muted-foreground font-normal">of rent ({fmt(lettingAgentCost)}/mo)</span></span>
                      : <span className="text-sm text-muted-foreground">—</span>}
                </Field>
              </CardContent>
            </Card>

            {/* Solicitor */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground" />Solicitor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Name / Firm">{isEditing ? EF("solicitor") : RV("solicitor")}</Field>
                <Field label="Phone">
                  {isEditing ? EF("solicitorPhone") : p.solicitorPhone
                    ? <a href={`tel:${p.solicitorPhone}`} className="flex items-center gap-1.5 text-sm hover:text-primary"><Phone className="h-3.5 w-3.5" />{p.solicitorPhone}</a>
                    : <span className="text-sm text-muted-foreground">—</span>}
                </Field>
              </CardContent>
            </Card>

            {/* Insurance */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" />Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Provider">{isEditing ? EF("insuranceProvider") : RV("insuranceProvider")}</Field>
                <Field label="Renewal Date">
                  {isEditing ? EF("insuranceRenewalDate", "date") : p.insuranceRenewalDate ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{format(new Date(p.insuranceRenewalDate), "d MMM yyyy")}</span>
                      {differenceInMonths(new Date(p.insuranceRenewalDate), new Date()) < 2 &&
                       differenceInMonths(new Date(p.insuranceRenewalDate), new Date()) >= 0 && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Renewing soon</Badge>
                      )}
                    </div>
                  ) : <span className="text-sm text-muted-foreground">—</span>}
                </Field>
              </CardContent>
            </Card>

            {/* Tradespeople */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />Tradespeople
                  </CardTitle>
                  {!isReadOnly && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                      onClick={() => setShowAddTrade(v => !v)}>
                      <Plus className="h-3.5 w-3.5" />{showAddTrade ? "Cancel" : "Add"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Add form */}
                {showAddTrade && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Trade Type</Label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={newTrade.tradeType}
                        onChange={e => setNewTrade(p => ({ ...p, tradeType: e.target.value }))}>
                        {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Name *</Label>
                      <Input className="h-8 text-sm" placeholder="Full name" value={newTrade.name}
                        onChange={e => setNewTrade(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Company</Label>
                      <Input className="h-8 text-sm" placeholder="Optional" value={newTrade.company}
                        onChange={e => setNewTrade(p => ({ ...p, company: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone</Label>
                        <Input className="h-8 text-sm" placeholder="Optional" value={newTrade.phone}
                          onChange={e => setNewTrade(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                        <Input className="h-8 text-sm" type="email" placeholder="Optional" value={newTrade.email}
                          onChange={e => setNewTrade(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
                      <Input className="h-8 text-sm" placeholder="Optional" value={newTrade.notes}
                        onChange={e => setNewTrade(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                    <Button size="sm" className="w-full h-8 text-xs" onClick={addTradesperson}
                      disabled={!newTrade.name.trim()}>
                      Save Tradesperson
                    </Button>
                  </div>
                )}

                {/* List */}
                {tradespeopleLoading ? (
                  <div className="space-y-2">
                    {[1,2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                  </div>
                ) : tradespeople && tradespeople.length > 0 ? (
                  <div className="space-y-2">
                    {tradespeople.map(t => (
                      <div key={t.id} className="rounded-lg border border-border/50 bg-card p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-xs shrink-0 ${TRADE_COLORS[t.tradeType] ?? TRADE_COLORS["Other"]}`}>
                                {t.tradeType}
                              </Badge>
                              <span className="text-sm font-medium truncate">{t.name}</span>
                            </div>
                            {t.company && (
                              <p className="text-xs text-muted-foreground mt-0.5">{t.company}</p>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                              {t.phone && (
                                <a href={`tel:${t.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                                  <Phone className="h-3 w-3" />{t.phone}
                                </a>
                              )}
                              {t.email && (
                                <a href={`mailto:${t.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                                  <Mail className="h-3 w-3" />{t.email}
                                </a>
                              )}
                            </div>
                            {t.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">{t.notes}</p>
                            )}
                          </div>
                          {!isReadOnly && (
                            <button onClick={() => deleteTradesperson(t.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
                    <Wrench className="h-7 w-7 opacity-20" />
                    <p className="text-xs text-center">No tradespeople saved yet.{!isReadOnly && " Click Add to get started."}</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
