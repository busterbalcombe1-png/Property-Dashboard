import { useState, useMemo, useCallback } from "react";
import { 
  Building2, 
  TrendingUp, 
  Wallet, 
  PoundSterling,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  AlertTriangle,
  ChevronRight,
  Percent,
  CalendarRange,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { useGetStats } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, parseISO } from "date-fns";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/app-layout";
import type { CalendarEvent } from "./calendar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  subtitle,
  loading 
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType; 
  trend?: number; 
  trendLabel?: string;
  subtitle?: string;
  loading?: boolean 
}) {
  return (
    <Card className="hover-elevate border-border/50 shadow-sm transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-md bg-primary/10 p-2 ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
            {subtitle && (
              <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
            )}
            {trend !== undefined && (
              <div className="mt-1 flex items-center text-xs">
                {trend >= 0 ? (
                  <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3 text-rose-500" />
                )}
                <span className={trend >= 0 ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>
                  {Math.abs(trend)}%
                </span>
                <span className="ml-1.5 text-muted-foreground">{trendLabel}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EVENT_DOT: Record<string, string> = {
  compliance: "bg-amber-500",
  lease_start: "bg-emerald-500",
  lease_end: "bg-rose-500",
  task: "bg-blue-500",
};

type CashflowMonthRecord = {
  id: number; month: string; income: string; expenses: string; notes: string | null;
  createdAt: string; updatedAt: string;
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats();
  const { data: rawCalEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-aggregate"],
    queryFn: () => fetch(`${API_BASE}/api/calendar/aggregate`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  });
  const calEvents: CalendarEvent[] = Array.isArray(rawCalEvents) ? rawCalEvents : [];
  const { data: rawCashflowMonths, refetch: refetchCashflow } = useQuery<CashflowMonthRecord[]>({
    queryKey: ["cashflow-months"],
    queryFn: () => fetch(`${API_BASE}/api/cashflow-months`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  });
  const cashflowMonths: CashflowMonthRecord[] = Array.isArray(rawCashflowMonths) ? rawCashflowMonths : [];

  const [appreciationRate, setAppreciationRate] = useState(5);
  const [projectionYears, setProjectionYears] = useState(25);

  const [cfEditOpen, setCfEditOpen] = useState(false);
  type DraftRow = { income: string; expenses: string; saving: boolean };
  const [cfDraft, setCfDraft] = useState<Record<string, DraftRow>>({});

  const openCfEdit = useCallback(() => {
    const draft: Record<string, DraftRow> = {};
    for (const r of cashflowMonths) {
      draft[r.month] = { income: String(parseFloat(r.income)), expenses: String(parseFloat(r.expenses)), saving: false };
    }
    setCfDraft(draft);
    setCfEditOpen(true);
  }, [cashflowMonths]);

  const saveCfRow = useCallback(async (month: string) => {
    const row = cfDraft[month];
    if (!row) return;
    setCfDraft(prev => ({ ...prev, [month]: { ...prev[month], saving: true } }));
    await fetch(`${API_BASE}/api/cashflow-months/${month}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ income: parseFloat(row.income) || 0, expenses: parseFloat(row.expenses) || 0 }),
    });
    await refetchCashflow();
    setCfDraft(prev => ({ ...prev, [month]: { ...prev[month], saving: false } }));
  }, [cfDraft, refetchCashflow]);

  const CHART_START = "2026-04";
  const cashflowChartData = useMemo(() => {
    const storedByMonth: Record<string, CashflowMonthRecord> = {};
    for (const r of cashflowMonths) storedByMonth[r.month] = r;

    const [startYr, startMo] = CHART_START.split("-").map(Number);

    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(startYr, startMo - 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const r = storedByMonth[key];
      const income = r ? Math.round(parseFloat(r.income)) : 0;
      const expenses = r ? Math.round(parseFloat(r.expenses)) : 0;
      const hasData = !!r;
      return { month: label, monthKey: key, income, expenses, cashflow: income - expenses, hasData };
    });
  }, [cashflowMonths]);

  const projectionData = useMemo(() => {
    if (!stats) return [];
    const currentYear = new Date().getFullYear();
    const currentValue = stats.totalPortfolioValue;
    const mortgageBalance = currentValue - stats.totalEquity;
    return Array.from({ length: projectionYears + 1 }, (_, i) => {
      const projectedValue = Math.round(currentValue * Math.pow(1 + appreciationRate / 100, i));
      const projectedEquity = Math.max(0, projectedValue - mortgageBalance);
      return {
        year: `${currentYear + i}`,
        value: projectedValue,
        equity: projectedEquity,
      };
    });
  }, [stats, appreciationRate, projectionYears]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = calEvents
    .filter(e => {
      const diff = differenceInDays(parseISO(e.date), today);
      return diff >= -1 && diff <= 60;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Portfolio Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Track your performance and vital statistics across all properties.</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            title="Total Portfolio Value"
            value={stats ? formatCurrency(stats.totalPortfolioValue) : "£0"}
            icon={Building2}
            trend={4.2}
            trendLabel="vs last year"
            loading={isLoading}
          />
          <StatCard
            title="Total Equity"
            value={stats ? formatCurrency(stats.totalEquity) : "£0"}
            icon={TrendingUp}
            trend={6.8}
            trendLabel="vs last year"
            loading={isLoading}
          />
          <StatCard
            title="Monthly Cashflow"
            value={stats ? formatCurrency(stats.monthlyCashflow) : "£0"}
            icon={Wallet}
            trend={12.5}
            trendLabel="vs last month"
            loading={isLoading}
          />
          <StatCard
            title="Total Rent Income"
            value={stats ? formatCurrency(stats.monthlyRentIncome) : "£0"}
            icon={PoundSterling}
            subtitle={stats ? `${formatCurrency(stats.monthlyRentIncome * 12)}/year` : undefined}
            loading={isLoading}
          />
        </div>

        {/* Upcoming Events Widget */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Coming Up
              </CardTitle>
              <Link href="/calendar">
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View calendar <ChevronRight className="h-3 w-3" />
                </button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nothing in the next 60 days</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingEvents.map(e => {
                  const d = parseISO(e.date);
                  const diff = differenceInDays(d, today);
                  const isOverdue = diff < 0;
                  const isCritical = diff >= 0 && diff <= 14;
                  const isWarning = diff > 14 && diff <= 30;
                  const urgColor = isOverdue ? "text-rose-600" : isCritical ? "text-rose-500" : isWarning ? "text-amber-600" : "text-muted-foreground";
                  const urgLabel = isOverdue ? "Overdue" : diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `${diff} days`;
                  return (
                    <Link key={e.id} href="/calendar">
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all cursor-pointer">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EVENT_DOT[e.type] ?? "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          {(e.propertyAddress ?? e.tenantName) && (
                            <p className="text-xs text-muted-foreground truncate">{e.propertyAddress ?? e.tenantName}</p>
                          )}
                          <p className={`text-xs font-medium mt-0.5 ${urgColor}`}>{format(d, "d MMM yyyy")} · {urgLabel}</p>
                        </div>
                        {(isOverdue || isCritical) && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Portfolio Value Projection */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle className="text-lg">Capital Appreciation Projection</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Forecast portfolio value and equity growth based on a target appreciation rate.</p>
                </div>
                {/* Controls */}
                <div className="flex flex-wrap items-end gap-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Annual Growth Rate</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={0.1}
                          max={30}
                          step={0.1}
                          value={appreciationRate}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v > 0 && v <= 30) setAppreciationRate(v);
                          }}
                          className="w-20 h-8 rounded-md border border-input bg-background px-2 pr-6 text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <Percent className="absolute right-1.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={15}
                        step={0.5}
                        value={appreciationRate}
                        onChange={e => setAppreciationRate(parseFloat(e.target.value))}
                        className="w-28 accent-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projection Period</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          step={1}
                          value={projectionYears}
                          onChange={e => {
                            const v = parseInt(e.target.value);
                            if (!isNaN(v) && v >= 1 && v <= 50) setProjectionYears(v);
                          }}
                          className="w-20 h-8 rounded-md border border-input bg-background px-2 pr-8 text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">yr</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={50}
                        step={5}
                        value={projectionYears}
                        onChange={e => setProjectionYears(parseInt(e.target.value))}
                        className="w-28 accent-blue-500"
                      />
                    </div>
                  </div>
                  {/* Summary callout */}
                  {stats && projectionData.length > 0 && (
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted-foreground">In {projectionYears} years at {appreciationRate}%/yr</p>
                      <p className="text-base font-bold text-blue-600">{formatCurrency(projectionData[projectionData.length - 1]?.value ?? 0)}</p>
                      <p className="text-xs text-muted-foreground">Equity: {formatCurrency(projectionData[projectionData.length - 1]?.equity ?? 0)}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projectionData} margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        dy={8}
                        interval={projectionYears <= 10 ? 0 : projectionYears <= 20 ? 1 : Math.floor(projectionYears / 10)}
                      />
                      <YAxis
                        tickFormatter={(val) => {
                          if (val >= 1_000_000) return `£${(val / 1_000_000).toFixed(1)}m`;
                          if (val >= 1_000) return `£${(val / 1_000).toFixed(0)}k`;
                          return `£${val}`;
                        }}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        width={60}
                      />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === "value" ? "Portfolio Value" : "Equity",
                        ]}
                        labelFormatter={(label) => `Year ${label}`}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: 13 }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                        formatter={(val) => val === "value" ? "Portfolio Value" : "Equity"}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="value"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: "#3b82f6" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="equity"
                        name="equity"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        strokeOpacity={0.4}
                        dot={false}
                        activeDot={{ r: 4, fill: "#3b82f6", fillOpacity: 0.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rent Distribution */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Rental Income</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.rentByProperty || []}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="rent"
                        nameKey="address"
                      >
                        {(stats?.rentByProperty || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(val) => <span className="text-xs text-foreground truncate max-w-[100px]">{val}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cashflow Chart */}
          <Card className="lg:col-span-3 border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-lg">Monthly Cashflow — Income vs Expenses</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Recorded at month-end · rolling 12 months from Apr 2026</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cfEditOpen ? () => setCfEditOpen(false) : openCfEdit}
                  className="shrink-0"
                >
                  {cfEditOpen ? <><X className="h-3.5 w-3.5 mr-1.5" />Close</>
                              : <><Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit Data</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Bar chart */}
              {cashflowMonths.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Wallet className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No cashflow data recorded yet.</p>
                </div>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflowChartData} margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        tickFormatter={(val) => val === 0 ? "£0" : `£${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        labelFormatter={(label, payload) => {
                          const hasData = payload?.[0]?.payload?.hasData as boolean;
                          if (!hasData) return <span><strong>{label}</strong><span className="ml-2 text-xs text-muted-foreground">No data yet</span></span>;
                          const net = payload?.[0] ? (payload[0].payload.cashflow as number) : null;
                          return (
                            <span>
                              <strong>{label}</strong>
                              {net !== null && (
                                <span className={`ml-2 text-xs font-medium ${net >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                  Net {formatCurrency(net)}
                                </span>
                              )}
                            </span>
                          );
                        }}
                        cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: 13 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: 12, fontSize: 13 }} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Edit panel */}
              {cfEditOpen && (
                <div className="mt-6 border border-border/50 rounded-lg overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Edit Monthly Records</p>
                    <p className="text-xs text-muted-foreground">Edit figures then click ✓ to save each row</p>
                  </div>
                  <div className="divide-y divide-border/50">
                    {cashflowMonths
                      .slice()
                      .sort((a, b) => a.month.localeCompare(b.month))
                      .map(r => {
                        const [yr, mo] = r.month.split("-").map(Number);
                        const label = new Date(yr, mo - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
                        const draft = cfDraft[r.month];
                        if (!draft) return null;
                        const income = parseFloat(draft.income) || 0;
                        const expenses = parseFloat(draft.expenses) || 0;
                        const net = income - expenses;
                        return (
                          <div key={r.month} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center px-4 py-3">
                            <div>
                              <p className="text-sm font-medium">{label}</p>
                              <p className={`text-xs mt-0.5 font-medium ${net >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                Net {formatCurrency(net)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Income (£)</label>
                              <Input
                                type="number"
                                className="h-8 text-sm"
                                value={draft.income}
                                onChange={e => setCfDraft(prev => ({ ...prev, [r.month]: { ...prev[r.month], income: e.target.value } }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Expenses (£)</label>
                              <Input
                                type="number"
                                className="h-8 text-sm"
                                value={draft.expenses}
                                onChange={e => setCfDraft(prev => ({ ...prev, [r.month]: { ...prev[r.month], expenses: e.target.value } }))}
                              />
                            </div>
                            <button
                              onClick={() => saveCfRow(r.month)}
                              disabled={draft.saving}
                              className="mt-5 flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors disabled:opacity-50"
                              title="Save this row"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </AppLayout>
  );
}
