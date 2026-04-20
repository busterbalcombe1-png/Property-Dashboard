import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Receipt, Users, Building2, Filter } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useListProperties } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const fmt = (v: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(v);

const CATEGORIES = [
  "Council Tax",
  "Gas / Heating",
  "Electricity",
  "Water",
  "Buildings Insurance",
  "Contents Insurance",
  "Broadband / Internet",
  "TV Licence",
  "Ground Rent",
  "Service Charge",
  "Gardening",
  "Cleaning",
  "Security / Alarm",
  "Pest Control",
  "Waste Removal",
  "Other",
];

const BILLING_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

export type OperatingCostItem = {
  id: number;
  propertyId: number;
  propertyAddress: string;
  category: string;
  description?: string;
  amount: number;
  billingPeriod: string;
  paidBy: string;
  notes?: string;
  active: boolean;
  monthlyEquivalent: number;
  createdAt: string;
  updatedAt: string;
};

const costSchema = z.object({
  propertyId: z.coerce.number().min(1, "Property is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be 0 or more"),
  billingPeriod: z.enum(["monthly", "quarterly", "annual"]),
  paidBy: z.enum(["me", "tenant"]),
  notes: z.string().optional(),
  active: z.boolean(),
});
type CostForm = z.infer<typeof costSchema>;

function toMonthly(amount: number, period: string) {
  if (period === "quarterly") return amount / 3;
  if (period === "annual") return amount / 12;
  return amount;
}

function PaidByBadge({ paidBy }: { paidBy: string }) {
  return paidBy === "me"
    ? <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Me (landlord)</Badge>
    : <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Tenant</Badge>;
}

function PeriodBadge({ period }: { period: string }) {
  const map: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", annual: "Annual" };
  return <span className="text-xs text-muted-foreground">{map[period] ?? period}</span>;
}

export default function OperatingCosts() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<OperatingCostItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterPropId, setFilterPropId] = useState<string>("all");
  const [filterPaidBy, setFilterPaidBy] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: properties = [] } = useListProperties();
  const { data: costs = [], isLoading } = useQuery<OperatingCostItem[]>({
    queryKey: ["operating-costs"],
    queryFn: () => fetch(`${API_BASE}/api/operating-costs`).then(r => r.json()),
  });

  const form = useForm<CostForm>({
    resolver: zodResolver(costSchema),
    defaultValues: { propertyId: 0, category: "", description: "", amount: 0, billingPeriod: "monthly", paidBy: "me", notes: "", active: true },
  });

  function openNew() {
    setEditItem(null);
    form.reset({ propertyId: 0, category: "", description: "", amount: 0, billingPeriod: "monthly", paidBy: "me", notes: "", active: true });
    setDialogOpen(true);
  }

  function openEdit(item: OperatingCostItem) {
    setEditItem(item);
    form.reset({
      propertyId: item.propertyId,
      category: item.category,
      description: item.description ?? "",
      amount: item.amount,
      billingPeriod: item.billingPeriod as "monthly" | "quarterly" | "annual",
      paidBy: item.paidBy as "me" | "tenant",
      notes: item.notes ?? "",
      active: item.active,
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: CostForm) => {
      const url = editItem ? `${API_BASE}/api/operating-costs/${editItem.id}` : `${API_BASE}/api/operating-costs`;
      const method = editItem ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to save");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operating-costs"] });
      setDialogOpen(false);
      toast({ title: editItem ? "Cost updated" : "Cost added" });
    },
    onError: () => toast({ title: "Error saving", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API_BASE}/api/operating-costs/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operating-costs"] });
      toast({ title: "Cost deleted" });
    },
    onError: () => toast({ title: "Error deleting", variant: "destructive" }),
  });

  const filtered = useMemo(() => costs.filter(c => {
    if (filterPropId !== "all" && c.propertyId !== parseInt(filterPropId)) return false;
    if (filterPaidBy !== "all" && c.paidBy !== filterPaidBy) return false;
    if (search && !`${c.category} ${c.description ?? ""} ${c.propertyAddress}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [costs, filterPropId, filterPaidBy, search]);

  const landlordMonthlyTotal = useMemo(() =>
    filtered.filter(c => c.paidBy === "me" && c.active).reduce((s, c) => s + c.monthlyEquivalent, 0),
    [filtered]
  );
  const tenantMonthlyTotal = useMemo(() =>
    filtered.filter(c => c.paidBy === "tenant" && c.active).reduce((s, c) => s + c.monthlyEquivalent, 0),
    [filtered]
  );

  const groupedByProperty = useMemo(() => {
    const map: Record<string, { address: string; items: OperatingCostItem[] }> = {};
    for (const c of filtered) {
      if (!map[c.propertyId]) map[c.propertyId] = { address: c.propertyAddress, items: [] };
      map[c.propertyId].items.push(c);
    }
    return Object.entries(map);
  }, [filtered]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Operating Costs</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage all running costs across your properties.</p>
          </div>
          {isAdmin && (
            <Button onClick={openNew} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /> Add Cost
            </Button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Monthly Costs</p>
              <p className="text-2xl font-bold mt-1 text-rose-600">{fmt(landlordMonthlyTotal)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Landlord-paid, monthly equiv.</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tenant Monthly Costs</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{fmt(tenantMonthlyTotal)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tenant-paid, monthly equiv.</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Line Items</p>
              <p className="text-2xl font-bold mt-1">{filtered.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Across {groupedByProperty.length} properties</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search costs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56 h-9 text-sm"
          />
          <Select value={filterPropId} onValueChange={setFilterPropId}>
            <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="All properties" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.address.split(",")[0]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPaidBy} onValueChange={setFilterPaidBy}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All payers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payers</SelectItem>
              <SelectItem value="me">Me (landlord)</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cost table */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Receipt className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">No operating costs found.</p>
              {isAdmin && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add First Cost</Button>}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Property</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className={!c.active ? "opacity-50" : ""}>
                    <TableCell className="text-sm font-medium max-w-[180px] truncate">{c.propertyAddress.split(",")[0]}</TableCell>
                    <TableCell className="text-sm">{c.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.description || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {fmt(c.amount)} <PeriodBadge period={c.billingPeriod} />
                    </TableCell>
                    <TableCell className="text-sm font-medium">{fmt(c.monthlyEquivalent)}</TableCell>
                    <TableCell><PaidByBadge paidBy={c.paidBy} /></TableCell>
                    <TableCell>
                      {c.active
                        ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                        : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Operating Cost" : "Add Operating Cost"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="propertyId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Property</FormLabel>
                  <Select value={String(field.value || "")} onValueChange={v => field.onChange(parseInt(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {properties.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Thames Water direct debit" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (£)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="billingPeriod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Period</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {BILLING_PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="paidBy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="me">Me (landlord) — counted in expenses</SelectItem>
                      <SelectItem value="tenant">Tenant — not counted in expenses</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Any additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Active (included in expense calculations)</FormLabel>
                </FormItem>
              )} />

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : editItem ? "Update" : "Add Cost"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cost?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this operating cost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
