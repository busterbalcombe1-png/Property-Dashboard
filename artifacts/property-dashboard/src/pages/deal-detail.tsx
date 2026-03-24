import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import {
  ArrowLeft, ExternalLink, Save, Trash2, Target, CheckCircle2,
  Phone, TrendingUp, Home, PoundSterling, FileText, Trophy,
  Edit2, X, ChevronRight, Circle, AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type DealStatus =
  | "criteria_check" | "calling_agent" | "initial_analysis" | "viewing"
  | "detailed_analysis" | "offer_made" | "offer_rejected" | "offer_accepted" | "dead";

interface DealData {
  criteriaCheck?:    CriteriaCheck;
  agentCall?:        AgentCall;
  initialAnalysis?:  InitialAnalysis;
  viewing?:          Viewing;
  detailedAnalysis?: DetailedAnalysis;
  offer?:            Offer;
  outcome?:          Outcome;
}

interface CriteriaCheck {
  strategy: string; targetArea: string; withinBudget: string;
  correctPropertyType: string; transportLinks: string; schoolRatings: string;
  crimeRate: string; noMajorIssues: string; yieldMeetsCriteria: string;
  verdict: string; notes: string;
}
interface AgentCall {
  callDate: string; spokenWith: string; reasonForSelling: string;
  timeOnMarket: string; previousOffers: string; priceFlexibility: string;
  chainSituation: string; propertyCondition: string; tenantsInSitu: string;
  tenantDetails: string; notes: string;
}
interface InitialAnalysis {
  askingPrice: number; estimatedValue: number; targetPrice: number;
  estimatedRent: number; estimatedRefurb: number; legalFees: number;
  surveyFees: number; verdict: string; notes: string;
}
interface Viewing {
  viewingDate: string; viewingTime: string; attendees: string;
  externalCondition: string; roof: string; damp: string; structural: string;
  electrics: string; plumbing: string; boilerInfo: string; windows: string;
  garden: string; parking: string; epcRating: string; extensionPotential: string;
  loftPotential: string; overallCondition: string; refurbRequired: string;
  notes: string; followUp: string;
}
interface DetailedAnalysis {
  purchasePrice: number; depositPct: number; monthlyRent: number;
  mortgageRate: number; mortgageType: string; insurance: number;
  lettingAgentPct: number; maintenancePct: number; voidWeeks: number;
  accountancy: number; groundRent: number; serviceCharge: number;
  otherExpenses: number; legalFees: number; surveyFees: number;
  refurbCost: number; otherCosts: number; lenderOptions: string;
  capitalGrowthRate: number; notes: string;
}
interface Offer {
  offerAmount: number; offerDate: string; offerStrategy: string;
  conditions: string; justification: string; notes: string;
}
interface Outcome {
  result: string; rejectionDate: string; sellerCounter: number;
  myResponse: string; myCounter: number; acceptedPrice: number;
  acceptedDate: string; solicitorName: string; solicitorPhone: string;
  solicitorEmail: string; mortgageLender: string; surveyType: string; surveyor: string;
  ms_solicitor: string; ms_searches: string; ms_surveyBooked: string;
  ms_surveyDone: string; ms_mortgageApp: string; ms_mortgageOffer: string;
  ms_exchanged: string; ms_completed: string; notes: string;
}

type Deal = {
  id: number; address: string; rightmoveUrl?: string; askingPrice?: number;
  propertyType?: string; bedrooms?: number; status: DealStatus;
  data: DealData; createdAt: string; updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v?: number) =>
  v == null || isNaN(v) ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v?: number) => v == null || isNaN(v) ? "—" : `${v.toFixed(2)}%`;
const n = (v: unknown) => typeof v === "number" && !isNaN(v) ? v : 0;

function calcSDLT(price: number): number {
  if (!price || price <= 0) return 0;
  const brackets = [
    { from: 0,       to: 125000,   rate: 0.03 },
    { from: 125000,  to: 250000,   rate: 0.05 },
    { from: 250000,  to: 925000,   rate: 0.08 },
    { from: 925000,  to: 1500000,  rate: 0.13 },
    { from: 1500000, to: Infinity, rate: 0.15 },
  ];
  let sdlt = 0;
  for (const b of brackets) {
    if (price > b.from) sdlt += (Math.min(price, b.to) - b.from) * b.rate;
  }
  return Math.round(sdlt);
}

const STATUS_META: Record<string, { label: string; color: string; step: number }> = {
  criteria_check:    { label: "Criteria Check",   color: "bg-blue-500/10 text-blue-600 border-blue-500/20",       step: 0 },
  calling_agent:     { label: "Calling Agent",    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",       step: 1 },
  initial_analysis:  { label: "Initial Analysis", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", step: 2 },
  viewing:           { label: "Viewing",           color: "bg-purple-500/10 text-purple-600 border-purple-500/20", step: 3 },
  detailed_analysis: { label: "Detailed Analysis",color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", step: 4 },
  offer_made:        { label: "Offer Made",        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",    step: 5 },
  offer_rejected:    { label: "Offer Rejected",    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",       step: 6 },
  offer_accepted:    { label: "Offer Accepted",    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", step: 6 },
  dead:              { label: "Dead",              color: "bg-slate-500/10 text-slate-500 border-slate-500/20",    step: -1 },
};

const STAGES = [
  "criteria_check","calling_agent","initial_analysis",
  "viewing","detailed_analysis","offer_made",
];

const STAGE_LABELS: Record<string, string> = {
  criteria_check: "Criteria", calling_agent: "Agent Call", initial_analysis: "Initial",
  viewing: "Viewing", detailed_analysis: "Detailed", offer_made: "Offer",
};

// ─── Row helper for compact form layout ───────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function YNSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="yes">✅ Yes</SelectItem>
        <SelectItem value="no">❌ No</SelectItem>
        <SelectItem value="unsure">❓ Unsure</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? (value.startsWith("-") ? "text-rose-600" : "text-emerald-600") : ""}`}>{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DealDetail() {
  const { isReadOnly } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const dealId = parseInt(id ?? "0");

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editBasics, setEditBasics] = useState(false);
  const [basicsDraft, setBasicsDraft] = useState<Partial<Deal>>({});
  const [data, setData] = useState<DealData>({});

  useEffect(() => {
    fetch(`/api/deals/${dealId}`)
      .then(r => r.json())
      .then((d: Deal) => { setDeal(d); setData(d.data ?? {}); })
      .finally(() => setLoading(false));
  }, [dealId]);

  const save = async (overrides?: Partial<Deal>) => {
    if (!deal) return;
    setSaving(true);
    try {
      const payload = { ...deal, ...overrides, data };
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated: Deal = await res.json();
      setDeal(updated);
      setData(updated.data ?? {});
      toast({ title: "Saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveSection = () => save();

  const setSection = <K extends keyof DealData>(key: K, val: DealData[K]) => {
    setData(prev => ({ ...prev, [key]: val }));
  };

  const upd = <K extends keyof DealData>(key: K) =>
    (field: string, val: unknown) =>
      setData(prev => ({ ...prev, [key]: { ...((prev[key] as Record<string, unknown>) ?? {}), [field]: val } }));

  const handleDelete = async () => {
    await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    navigate("/deals");
    toast({ title: "Deal deleted" });
  };

  const saveBasics = async () => {
    if (!deal) return;
    const updated = { ...deal, ...basicsDraft };
    setDeal(updated);
    await save({ ...basicsDraft });
    setEditBasics(false);
  };

  // ── Derived calculations (Detailed Analysis) ─────────────────────────────
  const da = data.detailedAnalysis ?? ({} as DetailedAnalysis);
  const pp = n(da.purchasePrice);
  const depPct = n(da.depositPct) || 25;
  const deposit = pp * depPct / 100;
  const mortgageAmt = pp - deposit;
  const monthlyRent = n(da.monthlyRent);
  const annualRent = monthlyRent * 12;
  const grossYield = pp > 0 ? (annualRent / pp) * 100 : 0;
  const annualMortgage = mortgageAmt * (n(da.mortgageRate) / 100);
  const lettingCost = annualRent * (n(da.lettingAgentPct) / 100);
  const maintCost = annualRent * (n(da.maintenancePct) / 100);
  const voidCost = (n(da.voidWeeks) / 52) * annualRent;
  const totalExpenses = annualMortgage + lettingCost + maintCost + voidCost +
    n(da.insurance) + n(da.accountancy) + n(da.groundRent) + n(da.serviceCharge) + n(da.otherExpenses);
  const netAnnual = annualRent - totalExpenses;
  const netYield = pp > 0 ? (netAnnual / pp) * 100 : 0;
  const monthlyCF = netAnnual / 12;
  const sdlt = calcSDLT(pp);
  const totalFunds = deposit + sdlt + n(da.legalFees) + n(da.surveyFees) + n(da.refurbCost) + n(da.otherCosts);
  const roi = totalFunds > 0 ? (netAnnual / totalFunds) * 100 : 0;
  const growthRate = (n(da.capitalGrowthRate) || 3) / 100;
  const val5 = pp * Math.pow(1 + growthRate, 5);
  const equity5 = val5 - mortgageAmt;
  const cashflow5 = monthlyCF * 60;
  const totalReturn5 = (equity5 - deposit) + cashflow5;

  // Initial analysis quick calcs
  const ia = data.initialAnalysis ?? ({} as InitialAnalysis);
  const iaAskingYield = n(ia.askingPrice) > 0 ? (n(ia.estimatedRent) * 12 / n(ia.askingPrice)) * 100 : 0;
  const iaTargetYield = n(ia.targetPrice) > 0 ? (n(ia.estimatedRent) * 12 / n(ia.targetPrice)) * 100 : 0;
  const iaSDLT = calcSDLT(n(ia.askingPrice));
  const iaTotalEst = n(ia.askingPrice) * 0.25 + iaSDLT + n(ia.estimatedRefurb) + n(ia.legalFees) + n(ia.surveyFees);

  if (loading) return (
    <AppLayout>
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </AppLayout>
  );

  if (!deal) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Deal not found.</p>
        <Button variant="outline" onClick={() => navigate("/deals")}>Back to Deals</Button>
      </div>
    </AppLayout>
  );

  const statusMeta = STATUS_META[deal.status] ?? STATUS_META.criteria_check;
  const currentStep = statusMeta.step;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-4xl">

        {/* Back + header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/deals")} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Back to Deals
          </Button>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setBasicsDraft({ ...deal }); setEditBasics(true); }}>
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Deal header card */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-5">
            {editBasics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Address</Label>
                    <Input value={basicsDraft.address ?? ""} onChange={e => setBasicsDraft(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Rightmove URL</Label>
                    <Input placeholder="https://www.rightmove.co.uk/properties/…"
                      value={basicsDraft.rightmoveUrl ?? ""} onChange={e => setBasicsDraft(p => ({ ...p, rightmoveUrl: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Asking Price (£)</Label>
                    <Input type="number" value={basicsDraft.askingPrice ?? ""} onChange={e => setBasicsDraft(p => ({ ...p, askingPrice: parseFloat(e.target.value) || undefined }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bedrooms</Label>
                    <Input type="number" value={basicsDraft.bedrooms ?? ""} onChange={e => setBasicsDraft(p => ({ ...p, bedrooms: parseInt(e.target.value) || undefined }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Property Type</Label>
                    <Select value={basicsDraft.propertyType ?? ""} onValueChange={v => setBasicsDraft(p => ({ ...p, propertyType: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {["Terraced","Semi-detached","Detached","Flat / Apartment","Bungalow","HMO","Commercial","Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                    <Select value={basicsDraft.status ?? deal.status} onValueChange={v => setBasicsDraft(p => ({ ...p, status: v as DealStatus }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditBasics(false)}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
                  <Button size="sm" onClick={saveBasics}><Save className="mr-1 h-3.5 w-3.5" />Save</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-display font-bold text-foreground">{deal.address || "Untitled Deal"}</h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    {deal.askingPrice && <span className="text-lg font-semibold">{fmt(deal.askingPrice)}</span>}
                    {deal.bedrooms && <span className="text-sm text-muted-foreground">{deal.bedrooms} bed</span>}
                    {deal.propertyType && <span className="text-sm text-muted-foreground">· {deal.propertyType}</span>}
                    <Badge variant="outline" className={`text-xs ${statusMeta.color}`}>{statusMeta.label}</Badge>
                  </div>
                  {deal.rightmoveUrl && (
                    <a href={deal.rightmoveUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1">
                      <ExternalLink className="h-3 w-3" />Open Rightmove Listing
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">Added {format(new Date(deal.createdAt), "d MMM yyyy")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage progress */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STAGES.map((stage, i) => {
            const done = currentStep > i;
            const active = currentStep === i;
            return (
              <div key={stage} className="flex items-center gap-1 shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  done ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                  active ? "bg-primary/10 text-primary border-primary/30" :
                  "bg-muted/50 text-muted-foreground border-border/30"}`}>
                  {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                  {STAGE_LABELS[stage]}
                </div>
                {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
              </div>
            );
          })}
          {(deal.status === "offer_accepted" || deal.status === "offer_rejected" || deal.status === "dead") && (
            <div className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusMeta.color}`}>
                {deal.status === "offer_accepted" ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {statusMeta.label}
              </div>
            </div>
          )}
        </div>

        {/* Update status quick bar */}
        {!isReadOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Move to stage:</span>
            {Object.entries(STATUS_META).map(([k, v]) => k !== deal.status && (
              <button key={k} onClick={() => { const updated = { ...deal, status: k as DealStatus }; setDeal(updated); save({ status: k as DealStatus }); }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-all hover:opacity-80 ${v.color}`}>
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* ── All sections ────────────────────────────────────────────────── */}
        <Accordion type="multiple" defaultValue={["criteria_check"]} className="space-y-3">

          {/* 1. Criteria Check */}
          <AccordionItem value="criteria_check" className="border border-border/50 rounded-xl shadow-sm bg-card overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-sm">1. Criteria Check</span>
                {data.criteriaCheck?.verdict && (
                  <Badge variant="outline" className={`text-xs ml-2 ${
                    data.criteriaCheck.verdict === "proceed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    data.criteriaCheck.verdict === "pass" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                    "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                    {data.criteriaCheck.verdict.charAt(0).toUpperCase() + data.criteriaCheck.verdict.slice(1)}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Row label="Strategy">
                  <Select value={data.criteriaCheck?.strategy ?? ""} onValueChange={v => upd("criteriaCheck")("strategy", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["BTL (Buy-to-Let)","HMO","BRRR","Flip / Refurb & Sell","Serviced Accommodation","Commercial","Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Within target area?">
                  <YNSelect value={data.criteriaCheck?.targetArea ?? ""} onChange={v => upd("criteriaCheck")("targetArea", v)} />
                </Row>
                <Row label="Within budget?">
                  <YNSelect value={data.criteriaCheck?.withinBudget ?? ""} onChange={v => upd("criteriaCheck")("withinBudget", v)} />
                </Row>
                <Row label="Correct property type?">
                  <YNSelect value={data.criteriaCheck?.correctPropertyType ?? ""} onChange={v => upd("criteriaCheck")("correctPropertyType", v)} />
                </Row>
                <Row label="Transport links">
                  <Select value={data.criteriaCheck?.transportLinks ?? ""} onValueChange={v => upd("criteriaCheck")("transportLinks", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["Excellent","Good","Average","Poor"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="School ratings">
                  <Select value={data.criteriaCheck?.schoolRatings ?? ""} onValueChange={v => upd("criteriaCheck")("schoolRatings", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["Outstanding","Good","Requires Improvement","Inadequate","Unknown"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Crime rate">
                  <Select value={data.criteriaCheck?.crimeRate ?? ""} onValueChange={v => upd("criteriaCheck")("crimeRate", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["Low","Average","High","Unknown"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="No major planning issues?">
                  <YNSelect value={data.criteriaCheck?.noMajorIssues ?? ""} onChange={v => upd("criteriaCheck")("noMajorIssues", v)} />
                </Row>
                <Row label="Yield meets criteria?">
                  <YNSelect value={data.criteriaCheck?.yieldMeetsCriteria ?? ""} onChange={v => upd("criteriaCheck")("yieldMeetsCriteria", v)} />
                </Row>
                <Row label="Verdict">
                  <Select value={data.criteriaCheck?.verdict ?? ""} onValueChange={v => upd("criteriaCheck")("verdict", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proceed">✅ Proceed</SelectItem>
                      <SelectItem value="maybe">❓ Maybe</SelectItem>
                      <SelectItem value="pass">❌ Pass</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <div className="md:col-span-2">
                  <Row label="Notes">
                    <Textarea className="text-sm min-h-20" placeholder="Any additional notes about whether this property meets your criteria…"
                      value={data.criteriaCheck?.notes ?? ""} onChange={e => upd("criteriaCheck")("notes", e.target.value)} />
                  </Row>
                </div>
              </div>
              {!isReadOnly && <div className="flex justify-end mt-4"><Button size="sm" onClick={saveSection} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />Save Section</Button></div>}
            </AccordionContent>
          </AccordionItem>

          {/* 2. Seller / Agent Call */}
          <AccordionItem value="agent_call" className="border border-border/50 rounded-xl shadow-sm bg-card overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-cyan-500" />
                <span className="font-semibold text-sm">2. Seller / Agent Call</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Row label="Date of call">
                  <Input type="date" className="h-8 text-sm" value={data.agentCall?.callDate ?? ""} onChange={e => upd("agentCall")("callDate", e.target.value)} />
                </Row>
                <Row label="Spoke with">
                  <Input className="h-8 text-sm" placeholder="Name / role" value={data.agentCall?.spokenWith ?? ""} onChange={e => upd("agentCall")("spokenWith", e.target.value)} />
                </Row>
                <Row label="Reason for selling">
                  <Input className="h-8 text-sm" placeholder="e.g. Relocating, chain break, investment" value={data.agentCall?.reasonForSelling ?? ""} onChange={e => upd("agentCall")("reasonForSelling", e.target.value)} />
                </Row>
                <Row label="Time on market">
                  <Input className="h-8 text-sm" placeholder="e.g. 3 weeks" value={data.agentCall?.timeOnMarket ?? ""} onChange={e => upd("agentCall")("timeOnMarket", e.target.value)} />
                </Row>
                <Row label="Previous offers / fall-throughs">
                  <Input className="h-8 text-sm" placeholder="Any previous offers?" value={data.agentCall?.previousOffers ?? ""} onChange={e => upd("agentCall")("previousOffers", e.target.value)} />
                </Row>
                <Row label="Price flexibility">
                  <Select value={data.agentCall?.priceFlexibility ?? ""} onValueChange={v => upd("agentCall")("priceFlexibility", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["Negotiable","Slightly negotiable","Firm — asking price only","Below asking offers considered"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Chain situation">
                  <Select value={data.agentCall?.chainSituation ?? ""} onValueChange={v => upd("agentCall")("chainSituation", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["Chain free","Short chain","Long chain","Unknown"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Tenants in situ?">
                  <YNSelect value={data.agentCall?.tenantsInSitu ?? ""} onChange={v => upd("agentCall")("tenantsInSitu", v)} />
                </Row>
                {data.agentCall?.tenantsInSitu === "yes" && (
                  <div className="md:col-span-2">
                    <Row label="Tenant details">
                      <Input className="h-8 text-sm" placeholder="Rent, AST end date, tenant situation…" value={data.agentCall?.tenantDetails ?? ""} onChange={e => upd("agentCall")("tenantDetails", e.target.value)} />
                    </Row>
                  </div>
                )}
                <div className="md:col-span-2">
                  <Row label="Property condition (as described)">
                    <Input className="h-8 text-sm" placeholder="What did they say about the condition?" value={data.agentCall?.propertyCondition ?? ""} onChange={e => upd("agentCall")("propertyCondition", e.target.value)} />
                  </Row>
                </div>
                <div className="md:col-span-2">
                  <Row label="Call notes">
                    <Textarea className="text-sm min-h-24" placeholder="Key things said during the call, any gut feelings, red flags or positives…"
                      value={data.agentCall?.notes ?? ""} onChange={e => upd("agentCall")("notes", e.target.value)} />
                  </Row>
                </div>
              </div>
              {!isReadOnly && <div className="flex justify-end mt-4"><Button size="sm" onClick={saveSection} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />Save Section</Button></div>}
            </AccordionContent>
          </AccordionItem>

          {/* 3. Initial Analysis */}
          <AccordionItem value="initial_analysis" className="border border-border/50 rounded-xl shadow-sm bg-card overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="font-semibold text-sm">3. Initial Analysis</span>
                {data.initialAnalysis?.verdict && (
                  <Badge variant="outline" className={`text-xs ml-2 ${
                    data.initialAnalysis.verdict === "proceed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    data.initialAnalysis.verdict === "pass" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                    "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                    {data.initialAnalysis.verdict.charAt(0).toUpperCase() + data.initialAnalysis.verdict.slice(1)}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Row label="Asking Price (£)">
                  <Input type="number" className="h-8 text-sm" value={data.initialAnalysis?.askingPrice ?? ""} onChange={e => upd("initialAnalysis")("askingPrice", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="My Estimated Value (£)">
                  <Input type="number" className="h-8 text-sm" placeholder="What I think it's worth" value={data.initialAnalysis?.estimatedValue ?? ""} onChange={e => upd("initialAnalysis")("estimatedValue", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Target Purchase Price (£)">
                  <Input type="number" className="h-8 text-sm" placeholder="What I'd aim to pay" value={data.initialAnalysis?.targetPrice ?? ""} onChange={e => upd("initialAnalysis")("targetPrice", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Estimated Monthly Rent (£)">
                  <Input type="number" className="h-8 text-sm" value={data.initialAnalysis?.estimatedRent ?? ""} onChange={e => upd("initialAnalysis")("estimatedRent", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Estimated Refurb Cost (£)">
                  <Input type="number" className="h-8 text-sm" value={data.initialAnalysis?.estimatedRefurb ?? ""} onChange={e => upd("initialAnalysis")("estimatedRefurb", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Estimated Legal Fees (£)">
                  <Input type="number" className="h-8 text-sm" placeholder="~1500" value={data.initialAnalysis?.legalFees ?? ""} onChange={e => upd("initialAnalysis")("legalFees", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Estimated Survey (£)">
                  <Input type="number" className="h-8 text-sm" placeholder="~500–1000" value={data.initialAnalysis?.surveyFees ?? ""} onChange={e => upd("initialAnalysis")("surveyFees", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Verdict">
                  <Select value={data.initialAnalysis?.verdict ?? ""} onValueChange={v => upd("initialAnalysis")("verdict", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proceed">✅ Proceed to viewing</SelectItem>
                      <SelectItem value="maybe">❓ Maybe</SelectItem>
                      <SelectItem value="pass">❌ Pass</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
              </div>
              {/* Quick calcs */}
              <div className="mt-4 p-4 rounded-lg bg-muted/40 border border-border/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Calculations</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Gross yield (asking)",  val: fmtPct(iaAskingYield) },
                    { label: "Gross yield (target)",  val: fmtPct(iaTargetYield) },
                    { label: "Discount to market",    val: n(ia.estimatedValue) > 0 ? fmtPct(((n(ia.estimatedValue) - n(ia.askingPrice)) / n(ia.estimatedValue)) * 100) : "—" },
                    { label: "Est. SDLT (BTL)",        val: fmt(iaSDLT) },
                    { label: "Est. total funds (25%)", val: fmt(iaTotalEst) },
                  ].map(r => (
                    <div key={r.label} className="bg-card rounded-md p-2.5 border border-border/30">
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                      <p className="text-sm font-bold mt-0.5">{r.val}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <Row label="Notes">
                  <Textarea className="text-sm min-h-20" placeholder="Initial thoughts, red flags, why this could be a good deal…"
                    value={data.initialAnalysis?.notes ?? ""} onChange={e => upd("initialAnalysis")("notes", e.target.value)} />
                </Row>
              </div>
              {!isReadOnly && <div className="flex justify-end mt-4"><Button size="sm" onClick={saveSection} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />Save Section</Button></div>}
            </AccordionContent>
          </AccordionItem>

          {/* 4. Viewing Notes */}
          <AccordionItem value="viewing" className="border border-border/50 rounded-xl shadow-sm bg-card overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-purple-500" />
                <span className="font-semibold text-sm">4. Viewing Notes</span>
                {data.viewing?.viewingDate && (
                  <span className="text-xs text-muted-foreground ml-2">{format(new Date(data.viewing.viewingDate), "d MMM yyyy")}</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Row label="Viewing Date">
                  <Input type="date" className="h-8 text-sm" value={data.viewing?.viewingDate ?? ""} onChange={e => upd("viewing")("viewingDate", e.target.value)} />
                </Row>
                <Row label="Viewing Time">
                  <Input type="time" className="h-8 text-sm" value={data.viewing?.viewingTime ?? ""} onChange={e => upd("viewing")("viewingTime", e.target.value)} />
                </Row>
                <div className="md:col-span-2">
                  <Row label="Attending">
                    <Input className="h-8 text-sm" placeholder="Who is attending the viewing?" value={data.viewing?.attendees ?? ""} onChange={e => upd("viewing")("attendees", e.target.value)} />
                  </Row>
                </div>
                <Separator className="md:col-span-2 my-1" />
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Property Condition Checks</p>
                </div>
                {([
                  ["External / Kerb Appeal", "externalCondition", ["Excellent","Good","Average","Poor"]],
                  ["Roof Condition", "roof", ["Good","Needs attention","Problem visible","Unknown"]],
                  ["Electrics", "electrics", ["Modern (< 10 yrs)","Dated (10–25 yrs)","Old (> 25 yrs)","Unknown"]],
                  ["Plumbing", "plumbing", ["Good","Average","Poor","Unknown"]],
                  ["Windows", "windows", ["Double glazed (new)","Double glazed (old)","Single glazed","Mixed"]],
                  ["Garden", "garden", ["Yes — large","Yes — small","No","Communal"]],
                  ["Parking", "parking", ["Driveway","Garage","On-street permit","On-street free","None"]],
                ] as [string, keyof Viewing, string[]][]).map(([label, field, options]) => (
                  <Row key={field} label={label}>
                    <Select value={(data.viewing?.[field] as string) ?? ""} onValueChange={v => upd("viewing")(field, v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </Row>
                ))}
                <Row label="Damp / Mould">
                  <Select value={data.viewing?.damp ?? ""} onValueChange={v => upd("viewing")("damp", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["None visible","Minor — superficial","Significant — needs investigation","Major concern"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Structural Concerns">
                  <Select value={data.viewing?.structural ?? ""} onValueChange={v => upd("viewing")("structural", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["None","Minor cracks","Significant — needs survey","Major concern"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="EPC Rating">
                  <Select value={data.viewing?.epcRating ?? ""} onValueChange={v => upd("viewing")("epcRating", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{["A","B","C","D","E","F","G","Unknown"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
                <Row label="Extension potential?">
                  <YNSelect value={data.viewing?.extensionPotential ?? ""} onChange={v => upd("viewing")("extensionPotential", v)} />
                </Row>
                <Row label="Loft conversion potential?">
                  <YNSelect value={data.viewing?.loftPotential ?? ""} onChange={v => upd("viewing")("loftPotential", v)} />
                </Row>
                <Row label="Overall condition">
                  <Select value={data.viewing?.overallCondition ?? ""} onValueChange={v => upd("viewing")("overallCondition", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{["Excellent — move-in ready","Good","Average","Below average","Poor / Uninhabitable"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
                <Row label="Refurb required">
                  <Select value={data.viewing?.refurbRequired ?? ""} onValueChange={v => upd("viewing")("refurbRequired", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{["None — turn-key","Cosmetic only","Light refurb","Moderate refurb","Full refurb"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
                <Row label="Boiler — type & age">
                  <Input className="h-8 text-sm" placeholder="e.g. Combi, 8 years old, Worcester Bosch" value={data.viewing?.boilerInfo ?? ""} onChange={e => upd("viewing")("boilerInfo", e.target.value)} />
                </Row>
                <div className="md:col-span-2">
                  <Row label="Viewing notes">
                    <Textarea className="text-sm min-h-28" placeholder="Overall impressions, anything that stood out (good or bad), things to investigate further…"
                      value={data.viewing?.notes ?? ""} onChange={e => upd("viewing")("notes", e.target.value)} />
                  </Row>
                </div>
                <div className="md:col-span-2">
                  <Row label="Follow-up items">
                    <Textarea className="text-sm min-h-16" placeholder="Things to check, questions to ask, further research needed…"
                      value={data.viewing?.followUp ?? ""} onChange={e => upd("viewing")("followUp", e.target.value)} />
                  </Row>
                </div>
              </div>
              {!isReadOnly && <div className="flex justify-end mt-4"><Button size="sm" onClick={saveSection} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />Save Section</Button></div>}
            </AccordionContent>
          </AccordionItem>

          {/* 5. Detailed Financial Analysis */}
          <AccordionItem value="detailed_analysis" className="border border-border/50 rounded-xl shadow-sm bg-card overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <PoundSterling className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold text-sm">5. Detailed Financial Analysis</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              {/* Results panel */}
              <div className="mt-2 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-muted/40 border border-border/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Income & Yield</p>
                  <ResultRow label="Gross Yield" value={fmtPct(grossYield)} />
                  <ResultRow label="Net Yield" value={fmtPct(netYield)} />
                  <ResultRow label="Monthly Cashflow" value={fmt(monthlyCF)} highlight />
                  <ResultRow label="Annual Cashflow" value={fmt(netAnnual)} highlight />
                  <ResultRow label="ROI" value={fmtPct(roi)} />
                </div>
                <div className="rounded-xl bg-muted/40 border border-border/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Funds Required</p>
                  <ResultRow label="Deposit" value={fmt(deposit)} />
                  <ResultRow label="SDLT (BTL, auto)" value={fmt(sdlt)} />
                  <ResultRow label="Legal + Survey + Refurb" value={fmt(n(da.legalFees) + n(da.surveyFees) + n(da.refurbCost))} />
                  <ResultRow label="Other costs" value={fmt(n(da.otherCosts))} />
                  <Separator className="my-1.5" />
                  <ResultRow label="Total Funds Required" value={fmt(totalFunds)} />
                </div>
                <div className="rounded-xl bg-muted/40 border border-border/40 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">5-Year Projection ({n(da.capitalGrowthRate) || 3}% annual growth)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Value in 5 yrs", val: fmt(val5) },
                      { label: "Equity in 5 yrs", val: fmt(equity5) },
                      { label: "Cashflow in 5 yrs", val: fmt(cashflow5) },
                      { label: "Total return", val: fmt(totalReturn5) },
                    ].map(r => (
                      <div key={r.label} className="bg-card rounded-md p-2.5 border border-border/30">
                        <p className="text-xs text-muted-foreground">{r.label}</p>
                        <p className="text-sm font-bold mt-0.5">{r.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Purchase & Finance</p>
                </div>
                <Row label="Purchase Price (£)">
                  <Input type="number" className="h-8 text-sm" value={da.purchasePrice ?? ""} onChange={e => upd("detailedAnalysis")("purchasePrice", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Deposit (%)">
                  <Input type="number" className="h-8 text-sm" placeholder="25" value={da.depositPct ?? ""} onChange={e => upd("detailedAnalysis")("depositPct", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Mortgage Rate (% p.a., interest only)">
                  <Input type="number" className="h-8 text-sm" step="0.01" placeholder="5.5" value={da.mortgageRate ?? ""} onChange={e => upd("detailedAnalysis")("mortgageRate", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Mortgage Type">
                  <Select value={da.mortgageType ?? ""} onValueChange={v => upd("detailedAnalysis")("mortgageType", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interest-only">Interest Only</SelectItem>
                      <SelectItem value="repayment">Repayment</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Capital Growth Rate (% p.a.)">
                  <Input type="number" className="h-8 text-sm" step="0.5" placeholder="3" value={da.capitalGrowthRate ?? ""} onChange={e => upd("detailedAnalysis")("capitalGrowthRate", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Lender options">
                  <Input className="h-8 text-sm" placeholder="e.g. BM Solutions, Paragon, Coventry BS" value={da.lenderOptions ?? ""} onChange={e => upd("detailedAnalysis")("lenderOptions", e.target.value)} />
                </Row>

                <div className="md:col-span-3 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Income</p>
                </div>
                <Row label="Monthly Rent (£)">
                  <Input type="number" className="h-8 text-sm" value={da.monthlyRent ?? ""} onChange={e => upd("detailedAnalysis")("monthlyRent", parseFloat(e.target.value) || 0)} />
                </Row>

                <div className="md:col-span-3 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Annual Expenses</p>
                </div>
                <Row label="Insurance (£/yr)">
                  <Input type="number" className="h-8 text-sm" placeholder="800" value={da.insurance ?? ""} onChange={e => upd("detailedAnalysis")("insurance", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Letting Agent (% of rent)">
                  <Input type="number" className="h-8 text-sm" step="0.5" placeholder="10" value={da.lettingAgentPct ?? ""} onChange={e => upd("detailedAnalysis")("lettingAgentPct", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Maintenance (% of rent)">
                  <Input type="number" className="h-8 text-sm" step="0.5" placeholder="10" value={da.maintenancePct ?? ""} onChange={e => upd("detailedAnalysis")("maintenancePct", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Void allowance (weeks/yr)">
                  <Input type="number" className="h-8 text-sm" placeholder="2" value={da.voidWeeks ?? ""} onChange={e => upd("detailedAnalysis")("voidWeeks", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Accountancy (£/yr)">
                  <Input type="number" className="h-8 text-sm" placeholder="500" value={da.accountancy ?? ""} onChange={e => upd("detailedAnalysis")("accountancy", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Ground Rent (£/yr)">
                  <Input type="number" className="h-8 text-sm" placeholder="0" value={da.groundRent ?? ""} onChange={e => upd("detailedAnalysis")("groundRent", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Service Charge (£/yr)">
                  <Input type="number" className="h-8 text-sm" placeholder="0" value={da.serviceCharge ?? ""} onChange={e => upd("detailedAnalysis")("serviceCharge", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Other Expenses (£/yr)">
                  <Input type="number" className="h-8 text-sm" placeholder="0" value={da.otherExpenses ?? ""} onChange={e => upd("detailedAnalysis")("otherExpenses", parseFloat(e.target.value) || 0)} />
                </Row>

                <div className="md:col-span-3 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Purchase Costs</p>
                </div>
                <Row label="Legal Fees (£)">
                  <Input type="number" className="h-8 text-sm" placeholder="1500" value={da.legalFees ?? ""} onChange={e => upd("detailedAnalysis")("legalFees", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Survey Fees (£)">
                  <Input type="number" className="h-8 text-sm" placeholder="700" value={da.surveyFees ?? ""} onChange={e => upd("detailedAnalysis")("surveyFees", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Refurb Cost (£)">
                  <Input type="number" className="h-8 text-sm" value={da.refurbCost ?? ""} onChange={e => upd("detailedAnalysis")("refurbCost", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Other Costs (£)">
                  <Input type="number" className="h-8 text-sm" value={da.otherCosts ?? ""} onChange={e => upd("detailedAnalysis")("otherCosts", parseFloat(e.target.value) || 0)} />
                </Row>
                <div className="md:col-span-3">
                  <Row label="Notes">
                    <Textarea className="text-sm min-h-20" placeholder="Finance notes, lender comments, assumptions used…"
                      value={da.notes ?? ""} onChange={e => upd("detailedAnalysis")("notes", e.target.value)} />
                  </Row>
                </div>
              </div>
              {!isReadOnly && <div className="flex justify-end mt-4"><Button size="sm" onClick={saveSection} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />Save Section</Button></div>}
            </AccordionContent>
          </AccordionItem>

          {/* 6. Offer */}
          <AccordionItem value="offer" className="border border-border/50 rounded-xl shadow-sm bg-card overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-sm">6. Offer</span>
                {data.offer?.offerAmount ? (
                  <span className="text-xs text-muted-foreground ml-2">{fmt(data.offer.offerAmount)}</span>
                ) : null}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Row label="Offer Amount (£)">
                  <Input type="number" className="h-8 text-sm" value={data.offer?.offerAmount ?? ""} onChange={e => upd("offer")("offerAmount", parseFloat(e.target.value) || 0)} />
                </Row>
                <Row label="Date of Offer">
                  <Input type="date" className="h-8 text-sm" value={data.offer?.offerDate ?? ""} onChange={e => upd("offer")("offerDate", e.target.value)} />
                </Row>
                {/* auto calc % below asking */}
                {data.offer?.offerAmount && deal.askingPrice ? (
                  <div className="md:col-span-2 p-3 rounded-lg bg-muted/40 border border-border/30">
                    <p className="text-xs text-muted-foreground">Offer is <strong>{fmtPct(((deal.askingPrice - data.offer.offerAmount) / deal.askingPrice) * 100)}</strong> below asking price ({fmt(deal.askingPrice - data.offer.offerAmount)} below)</p>
                  </div>
                ) : null}
                <Row label="Offer Strategy">
                  <Select value={data.offer?.offerStrategy ?? ""} onValueChange={v => upd("offer")("offerStrategy", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["First offer — room to negotiate","Best and final","Single take-it-or-leave-it","Incremental","Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Conditions">
                  <Input className="h-8 text-sm" placeholder="e.g. Subject to survey, subject to finance" value={data.offer?.conditions ?? ""} onChange={e => upd("offer")("conditions", e.target.value)} />
                </Row>
                <div className="md:col-span-2">
                  <Row label="Justification for offer">
                    <Textarea className="text-sm min-h-16" placeholder="Evidence used to justify the offer price — comparables, condition, market trends…"
                      value={data.offer?.justification ?? ""} onChange={e => upd("offer")("justification", e.target.value)} />
                  </Row>
                </div>
                <div className="md:col-span-2">
                  <Row label="Notes">
                    <Textarea className="text-sm min-h-16" placeholder="How the offer was received, agent reaction, next steps…"
                      value={data.offer?.notes ?? ""} onChange={e => upd("offer")("notes", e.target.value)} />
                  </Row>
                </div>
              </div>
              {!isReadOnly && <div className="flex justify-end mt-4"><Button size="sm" onClick={saveSection} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />Save Section</Button></div>}
            </AccordionContent>
          </AccordionItem>

          {/* 7. Outcome */}
          <AccordionItem value="outcome" className="border border-border/50 rounded-xl shadow-sm bg-card overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <Trophy className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-sm">7. Outcome</span>
                {data.outcome?.result && (
                  <Badge variant="outline" className={`text-xs ml-2 ${
                    data.outcome.result === "accepted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    data.outcome.result === "rejected" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                    "bg-slate-500/10 text-slate-500 border-slate-500/20"}`}>
                    {data.outcome.result.charAt(0).toUpperCase() + data.outcome.result.slice(1)}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-6 pt-2">
                <Row label="Result">
                  <Select value={data.outcome?.result ?? ""} onValueChange={v => upd("outcome")("result", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accepted">✅ Offer Accepted</SelectItem>
                      <SelectItem value="rejected">❌ Offer Rejected</SelectItem>
                      <SelectItem value="withdrawn">🚶 Withdrawn — we walked away</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>

                {/* Rejected sub-section */}
                {(data.outcome?.result === "rejected") && (
                  <div className="space-y-4 p-4 rounded-lg border border-rose-500/20 bg-rose-500/5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Rejection Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Row label="Rejection Date">
                        <Input type="date" className="h-8 text-sm" value={data.outcome?.rejectionDate ?? ""} onChange={e => upd("outcome")("rejectionDate", e.target.value)} />
                      </Row>
                      <Row label="Seller's Counter Offer (£)">
                        <Input type="number" className="h-8 text-sm" value={data.outcome?.sellerCounter ?? ""} onChange={e => upd("outcome")("sellerCounter", parseFloat(e.target.value) || 0)} />
                      </Row>
                      <Row label="My Response">
                        <Select value={data.outcome?.myResponse ?? ""} onValueChange={v => upd("outcome")("myResponse", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="walk-away">Walk away</SelectItem>
                            <SelectItem value="accept-counter">Accept counter offer</SelectItem>
                            <SelectItem value="counter-back">Counter back</SelectItem>
                          </SelectContent>
                        </Select>
                      </Row>
                      {data.outcome?.myResponse === "counter-back" && (
                        <Row label="My Counter Amount (£)">
                          <Input type="number" className="h-8 text-sm" value={data.outcome?.myCounter ?? ""} onChange={e => upd("outcome")("myCounter", parseFloat(e.target.value) || 0)} />
                        </Row>
                      )}
                      <div className="md:col-span-2">
                        <Row label="Notes">
                          <Textarea className="text-sm min-h-16" placeholder="What happened, lessons learned…"
                            value={data.outcome?.notes ?? ""} onChange={e => upd("outcome")("notes", e.target.value)} />
                        </Row>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accepted sub-section */}
                {data.outcome?.result === "accepted" && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-3">Accepted Terms</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Row label="Accepted Price (£)">
                          <Input type="number" className="h-8 text-sm" value={data.outcome?.acceptedPrice ?? ""} onChange={e => upd("outcome")("acceptedPrice", parseFloat(e.target.value) || 0)} />
                        </Row>
                        <Row label="Date Accepted">
                          <Input type="date" className="h-8 text-sm" value={data.outcome?.acceptedDate ?? ""} onChange={e => upd("outcome")("acceptedDate", e.target.value)} />
                        </Row>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border/40 bg-muted/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Professional Team</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Row label="Solicitor Name / Firm">
                          <Input className="h-8 text-sm" value={data.outcome?.solicitorName ?? ""} onChange={e => upd("outcome")("solicitorName", e.target.value)} />
                        </Row>
                        <Row label="Solicitor Phone">
                          <Input className="h-8 text-sm" value={data.outcome?.solicitorPhone ?? ""} onChange={e => upd("outcome")("solicitorPhone", e.target.value)} />
                        </Row>
                        <Row label="Solicitor Email">
                          <Input type="email" className="h-8 text-sm" value={data.outcome?.solicitorEmail ?? ""} onChange={e => upd("outcome")("solicitorEmail", e.target.value)} />
                        </Row>
                        <Row label="Mortgage Lender">
                          <Input className="h-8 text-sm" value={data.outcome?.mortgageLender ?? ""} onChange={e => upd("outcome")("mortgageLender", e.target.value)} />
                        </Row>
                        <Row label="Survey Type">
                          <Select value={data.outcome?.surveyType ?? ""} onValueChange={v => upd("outcome")("surveyType", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              {["RICS Level 1 (Condition Report)","RICS Level 2 (HomeBuyer Report)","RICS Level 3 (Building Survey)","Valuation Only"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Row>
                        <Row label="Surveyor">
                          <Input className="h-8 text-sm" value={data.outcome?.surveyor ?? ""} onChange={e => upd("outcome")("surveyor", e.target.value)} />
                        </Row>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border/40 bg-muted/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Milestone Tracker</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {([
                          ["Solicitor instructed", "ms_solicitor"],
                          ["Searches ordered", "ms_searches"],
                          ["Survey booked", "ms_surveyBooked"],
                          ["Survey completed", "ms_surveyDone"],
                          ["Mortgage application", "ms_mortgageApp"],
                          ["Mortgage offer received", "ms_mortgageOffer"],
                          ["Exchange of contracts", "ms_exchanged"],
                          ["Completion", "ms_completed"],
                        ] as [string, keyof Outcome][]).map(([label, field]) => (
                          <div key={field} className="flex items-center gap-3">
                            <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${(data.outcome?.[field] as string) ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <Input type="date" className="h-7 text-xs mt-0.5"
                                value={(data.outcome?.[field] as string) ?? ""} onChange={e => upd("outcome")(field, e.target.value)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Row label="Notes">
                      <Textarea className="text-sm min-h-16" placeholder="Any notes about the purchase progression…"
                        value={data.outcome?.notes ?? ""} onChange={e => upd("outcome")("notes", e.target.value)} />
                    </Row>
                  </div>
                )}
              </div>
              {!isReadOnly && <div className="flex justify-end mt-4"><Button size="sm" onClick={saveSection} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />Save Section</Button></div>}
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>All analysis data for "{deal.address}" will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
