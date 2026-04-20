import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { format, differenceInMonths, differenceInDays, addMonths } from "date-fns";
import {
  ArrowLeft, Mail, Phone, Calendar, PoundSterling,
  Shield, FileText, Edit2, AlertTriangle, CheckCircle2,
  Users, TrendingUp, Building2, RotateCcw, Bell
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useUpdateTenant, getListTenantsQueryKey } from "@workspace/api-client-react";
import { useListProperties } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(val);

const tenantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  propertyId: z.coerce.number().min(1),
  leaseStart: z.string().min(1),
  noticeGivenDate: z.string().optional().or(z.literal("")),
  monthlyRent: z.coerce.number().min(0),
  depositPaid: z.coerce.number().min(0),
  status: z.enum(["active", "inactive", "pending"]),
  notes: z.string().optional(),
});

type TenantDetail = {
  id: number; firstName: string; lastName: string; email: string; phone: string;
  propertyId: number; propertyAddress: string; leaseStart: string;
  noticeGivenDate?: string;
  monthlyRent: number; depositPaid: number; status: string; notes?: string;
  partnerFirstName?: string; partnerLastName?: string; partnerEmail?: string; partnerPhone?: string;
  createdAt: string; updatedAt: string;
};

type RentPayment = {
  id: number; dueDate: string; paidDate?: string; amountDue: number; amountPaid?: number;
  status: string; paymentMethod?: string; reference?: string; notes?: string;
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
    case "inactive": return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Inactive</Badge>;
    case "pending": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Pending</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">Paid</Badge>;
    case "overdue": return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs">Overdue</Badge>;
    case "partial": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Partial</Badge>;
    case "pending": return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 text-xs">Pending</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function KpiCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: React.ElementType; accent?: "amber" | "rose" }) {
  const ring = accent === "amber" ? "ring-amber-500/20 bg-amber-500/10" : accent === "rose" ? "ring-rose-500/20 bg-rose-500/10" : "ring-primary/20 bg-primary/10";
  const icon = accent === "amber" ? "text-amber-600" : accent === "rose" ? "text-rose-600" : "text-primary";
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`rounded-md p-2 ring-1 shrink-0 mt-0.5 ${ring}`}>
            <Icon className={`h-4 w-4 ${icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TenantDetail() {
  const { isReadOnly } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const tenantId = parseInt(id ?? "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: properties } = useListProperties();
  const [editOpen, setEditOpen] = useState(false);

  const { data: tenant, isLoading } = useQuery<TenantDetail>({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetch(`/api/tenants/${tenantId}`).then(r => r.json()),
    enabled: !!tenantId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<RentPayment[]>({
    queryKey: ["rent-payments-tenant", tenantId],
    queryFn: () => fetch(`/api/rent/payments?tenantId=${tenantId}`).then(r => r.json()),
    enabled: !!tenantId,
  });

  const updateMutation = useUpdateTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        setEditOpen(false);
        toast({ title: "Tenant updated" });
      },
    },
  });

  const form = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", propertyId: 0, leaseStart: "", noticeGivenDate: "", monthlyRent: 0, depositPaid: 0, status: "active", notes: "" },
  });

  const openEdit = () => {
    if (!tenant) return;
    form.reset({
      firstName: tenant.firstName, lastName: tenant.lastName, email: tenant.email,
      phone: tenant.phone, propertyId: tenant.propertyId,
      leaseStart: tenant.leaseStart.split("T")[0],
      noticeGivenDate: tenant.noticeGivenDate ?? "",
      monthlyRent: tenant.monthlyRent, depositPaid: tenant.depositPaid,
      status: tenant.status as "active" | "inactive" | "pending",
      notes: tenant.notes ?? "",
    });
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-5xl">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!tenant || (tenant as unknown as { error: string }).error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Users className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Tenant not found.</p>
          <Button variant="outline" onClick={() => navigate("/tenants")}><ArrowLeft className="mr-2 h-4 w-4" />Back to Tenants</Button>
        </div>
      </AppLayout>
    );
  }

  const leaseStart = new Date(tenant.leaseStart);
  const today = new Date();
  const monthsIn = differenceInMonths(today, leaseStart);
  const daysIn = differenceInDays(today, leaseStart);

  const noticeDate = tenant.noticeGivenDate ? new Date(tenant.noticeGivenDate) : null;
  const vacateDate = noticeDate ? addMonths(noticeDate, 2) : null;
  const daysToVacate = vacateDate ? differenceInDays(vacateDate, today) : null;
  const noticeActive = noticeDate != null;

  const paidCount = payments?.filter(p => p.status === "paid").length ?? 0;
  const totalPayments = payments?.length ?? 0;
  const paymentRate = totalPayments > 0 ? Math.round((paidCount / totalPayments) * 100) : null;

  const kpi3Label = noticeActive
    ? (daysToVacate != null && daysToVacate < 0 ? "Overdue Vacate" : "Days to Vacate")
    : "Time Tenanted";
  const kpi3Value = noticeActive
    ? (daysToVacate != null ? (daysToVacate < 0 ? `${Math.abs(daysToVacate)}d overdue` : `${daysToVacate}d`) : "—")
    : (monthsIn >= 12 ? `${Math.floor(monthsIn / 12)}yr ${monthsIn % 12}mo` : `${monthsIn}mo`);
  const kpi3Sub = noticeActive && vacateDate
    ? `Vacates ${format(vacateDate, "d MMM yyyy")}`
    : `Started ${format(leaseStart, "d MMM yyyy")} · ${daysIn} days`;
  const kpi3Accent = noticeActive ? (daysToVacate != null && daysToVacate <= 14 ? "rose" : "amber") : undefined;
  const kpi3Icon = noticeActive ? Bell : RotateCcw;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl pb-12">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/tenants")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1.5 h-4 w-4" />Tenants
            </Button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-medium">{tenant.firstName} {tenant.lastName}</span>
          </div>
          {!isReadOnly && <Button size="sm" onClick={openEdit}>
            <Edit2 className="mr-2 h-4 w-4" />Edit Tenant
          </Button>}
        </div>

        {/* Name + status heading */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-primary">
              {tenant.firstName[0]}{tenant.lastName[0]}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{tenant.firstName} {tenant.lastName}</h1>
              <StatusBadge status={tenant.status} />
              {!noticeActive && (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs gap-1">
                  <RotateCcw className="h-3 w-3" />Rolling periodic
                </Badge>
              )}
              {noticeActive && (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs gap-1">
                  <Bell className="h-3 w-3" />Notice given
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <button onClick={() => navigate(`/properties/${tenant.propertyId}`)} className="hover:underline hover:text-foreground transition-colors">
                {tenant.propertyAddress || "Unassigned"}
              </button>
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Monthly Rent" value={fmt(tenant.monthlyRent)} sub={`${fmt(tenant.monthlyRent * 12)}/yr`} icon={PoundSterling} />
          <KpiCard label="Deposit Held" value={fmt(tenant.depositPaid)} sub={`${(tenant.depositPaid / tenant.monthlyRent).toFixed(1)} weeks' rent`} icon={Shield} />
          <KpiCard
            label={kpi3Label}
            value={kpi3Value}
            sub={kpi3Sub}
            icon={kpi3Icon}
            accent={kpi3Accent}
          />
          <KpiCard
            label="Payment Rate"
            value={paymentRate != null ? `${paymentRate}%` : "—"}
            sub={totalPayments > 0 ? `${paidCount}/${totalPayments} payments on time` : "No payment history yet"}
            icon={TrendingUp}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Tenancy card */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />Tenancy Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Property</p>
                    <button onClick={() => navigate(`/properties/${tenant.propertyId}`)} className="text-sm font-medium hover:underline hover:text-primary transition-colors text-left">
                      {tenant.propertyAddress || "Unassigned"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Tenancy Start</p>
                    <p className="text-sm font-medium">{format(leaseStart, "d MMM yyyy")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Duration</p>
                    <p className="text-sm font-medium">
                      {monthsIn >= 12
                        ? `${Math.floor(monthsIn / 12)} yr${Math.floor(monthsIn / 12) > 1 ? "s" : ""} ${monthsIn % 12 > 0 ? `${monthsIn % 12} mo` : ""}`
                        : `${monthsIn} month${monthsIn !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Contract Type</p>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      <RotateCcw className="h-3.5 w-3.5" />Rolling periodic
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Notice Period</p>
                    <p className="text-sm font-medium text-muted-foreground">2 months</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Notice Given</p>
                    {noticeDate ? (
                      <p className="text-sm font-medium text-amber-600">{format(noticeDate, "d MMM yyyy")}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>

                {/* Notice period bar — only shown when notice given */}
                {noticeActive && noticeDate && vacateDate && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Notice given {format(noticeDate, "d MMM yyyy")}</span>
                      <span className={`font-medium ${daysToVacate != null && daysToVacate <= 0 ? "text-rose-600" : "text-amber-600"}`}>
                        {daysToVacate != null && daysToVacate <= 0 ? "Overdue" : `${daysToVacate}d remaining`}
                      </span>
                      <span>Vacates {format(vacateDate, "d MMM yyyy")}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${daysToVacate != null && daysToVacate <= 0 ? "bg-rose-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(100, Math.max(0, ((differenceInDays(today, noticeDate) / 60) * 100)))}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">2-month statutory notice period</p>
                  </div>
                )}

                {/* Notice alert */}
                {noticeActive && vacateDate && (
                  <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${daysToVacate != null && daysToVacate <= 0 ? "bg-rose-500/10 text-rose-700" : "bg-amber-500/10 text-amber-700"}`}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {daysToVacate != null && daysToVacate <= 0
                        ? `Tenant was due to vacate on ${format(vacateDate, "d MMM yyyy")}. Confirm departure and arrange end-of-tenancy inspection.`
                        : `Tenant has given notice. Expected vacate date: ${format(vacateDate, "d MMM yyyy")} (${daysToVacate} days).`}
                    </span>
                  </div>
                )}

                {/* Rolling tenancy info — when no notice given */}
                {!noticeActive && (
                  <div className="flex items-start gap-2 rounded-lg p-3 text-sm bg-muted/50 text-muted-foreground">
                    <RotateCcw className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>
                      This is a rolling periodic tenancy under the Renters Reform Act. No fixed end date applies.
                      The tenancy continues until either party gives 2 months' written notice.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rent payment history */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : !payments?.length ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No payment records linked to this tenant yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {payments.slice(0, 12).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between py-2 px-1 rounded-md hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${
                            payment.status === "paid" ? "bg-emerald-500" :
                            payment.status === "overdue" ? "bg-rose-500" :
                            payment.status === "partial" ? "bg-amber-500" : "bg-slate-400"
                          }`} />
                          <div>
                            <p className="text-sm font-medium">{format(new Date(payment.dueDate), "MMMM yyyy")}</p>
                            {payment.paidDate && (
                              <p className="text-xs text-muted-foreground">
                                Paid {format(new Date(payment.paidDate), "d MMM yyyy")}
                                {payment.paymentMethod && ` · ${payment.paymentMethod.replace(/_/g, " ")}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">{fmt(payment.amountDue)}</p>
                            {payment.amountPaid != null && payment.amountPaid !== payment.amountDue && (
                              <p className="text-xs text-muted-foreground">{fmt(payment.amountPaid)} paid</p>
                            )}
                          </div>
                          <PaymentStatusBadge status={payment.status} />
                        </div>
                      </div>
                    ))}
                    {payments.length > 12 && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        Showing 12 of {payments.length} payments — view full history in Rent Accounts
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* Contact card */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Lead Tenant</p>
                  <div className="space-y-2">
                    <a href={`mailto:${tenant.email}`} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {tenant.email}
                    </a>
                    <a href={`tel:${tenant.phone}`} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {tenant.phone}
                    </a>
                  </div>
                </div>
                {(tenant.partnerFirstName || tenant.partnerEmail || tenant.partnerPhone) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                        Partner{tenant.partnerFirstName ? ` — ${tenant.partnerFirstName}${tenant.partnerLastName ? " " + tenant.partnerLastName : ""}` : ""}
                      </p>
                      <div className="space-y-2">
                        {tenant.partnerEmail && (
                          <a href={`mailto:${tenant.partnerEmail}`} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {tenant.partnerEmail}
                          </a>
                        )}
                        {tenant.partnerPhone && (
                          <a href={`tel:${tenant.partnerPhone}`} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {tenant.partnerPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Tenant Since</p>
                  <p className="text-sm font-medium">{format(new Date(tenant.createdAt), "d MMM yyyy")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Financial summary */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />Financials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Monthly Rent", value: fmt(tenant.monthlyRent) },
                  { label: "Annual Rent", value: fmt(tenant.monthlyRent * 12) },
                  { label: "Deposit Held", value: fmt(tenant.depositPaid) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold">{value}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Deposit / Rent weeks</span>
                  <span className="text-sm font-semibold">
                    {((tenant.depositPaid / tenant.monthlyRent) * (52 / 12)).toFixed(1)} weeks
                  </span>
                </div>
                {tenant.depositPaid / tenant.monthlyRent > 5 * (12 / 52) && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-500/10 rounded-md p-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Deposit may exceed the 5-week statutory cap. Review recommended.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {tenant.notes && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tenant.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Compliance checklist */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />Compliance Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {[
                    "Right-to-rent check completed",
                    "Gas safety certificate provided",
                    "EPC certificate provided",
                    "How to rent guide provided",
                    "Deposit prescribed information sent",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/50 mt-3">Checklist items are for reference — tick these off in your own records.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => updateMutation.mutate({ id: tenantId, data: { ...values, noticeGivenDate: values.noticeGivenDate || undefined } }))} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 mb-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Personal Details</h4>
                </div>
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="md:col-span-2 mt-4 mb-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tenancy Details</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Rolling periodic tenancy — no fixed end date (Renters Reform Act)</p>
                  <div className="h-px w-full bg-border mt-2" />
                </div>

                <FormField control={form.control} name="propertyId" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Property</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Assign property" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {properties?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.address}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="leaseStart" render={({ field }) => (
                  <FormItem><FormLabel>Tenancy Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="noticeGivenDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Notice Given Date
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="monthlyRent" render={({ field }) => (
                  <FormItem><FormLabel>Monthly Rent (£)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="depositPaid" render={({ field }) => (
                  <FormItem><FormLabel>Deposit Paid (£)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="md:col-span-2">
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
