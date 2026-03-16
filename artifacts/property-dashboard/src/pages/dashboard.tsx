import { 
  Building2, 
  TrendingUp, 
  Wallet, 
  PoundSterling,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/app-layout";
import {
  AreaChart,
  Area,
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
  loading 
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType; 
  trend?: number; 
  trendLabel?: string;
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

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats();

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
            loading={isLoading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Portfolio Value History */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Value Growth</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.portfolioValueHistory || []} margin={{ top: 5, right: 0, left: 20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        tickFormatter={(val) => `£${val/1000}k`} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        name="Value"
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                    </AreaChart>
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
            <CardHeader>
              <CardTitle className="text-lg">Monthly Cashflow (Income vs Expenses)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.cashflowByMonth || []} margin={{ top: 5, right: 0, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        tickFormatter={(val) => `£${val}`} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </AppLayout>
  );
}
