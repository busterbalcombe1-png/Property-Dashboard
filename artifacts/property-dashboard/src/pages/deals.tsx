import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { Plus, Target, ExternalLink, Trash2, ChevronRight, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Deal = {
  id: number; address: string; rightmoveUrl?: string; askingPrice?: number;
  propertyType?: string; bedrooms?: number; status: string; createdAt: string;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  criteria_check:   { label: "Criteria Check",   color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  calling_agent:    { label: "Calling Agent",     color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  initial_analysis: { label: "Initial Analysis",  color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  viewing:          { label: "Viewing",            color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  detailed_analysis:{ label: "Detailed Analysis", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  offer_made:       { label: "Offer Made",         color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  offer_rejected:   { label: "Offer Rejected",     color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  offer_accepted:   { label: "Offer Accepted",     color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  dead:             { label: "Dead",               color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
};

const fmt = (val?: number) =>
  val == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(val);

const BLANK_DEAL = { address: "", rightmoveUrl: "", askingPrice: "", propertyType: "", bedrooms: "" };

export default function Deals() {
  const { isReadOnly } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_DEAL);
  const [saving, setSaving] = useState(false);

  const { data: deals, isLoading } = useQuery<Deal[]>({
    queryKey: ["deals"],
    queryFn: () => fetch("/api/deals").then(r => r.json()),
  });

  const filtered = deals?.filter(d =>
    d.address.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleCreate = async () => {
    if (!form.address.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          rightmoveUrl: form.rightmoveUrl || undefined,
          askingPrice: form.askingPrice ? parseFloat(form.askingPrice) : undefined,
          propertyType: form.propertyType || undefined,
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        }),
      });
      const deal = await res.json();
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setDialogOpen(false);
      setForm(BLANK_DEAL);
      navigate(`/deals/${deal.id}`);
    } catch {
      toast({ title: "Failed to create deal", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/deals/${deleteId}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setDeleteId(null);
    toast({ title: "Deal removed" });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Deal Tracker</h1>
            <p className="text-muted-foreground mt-1 text-sm">Track and analyse potential property acquisitions through every stage.</p>
          </div>
          {!isReadOnly && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-sm hover-elevate active-elevate-2" onClick={() => setForm(BLANK_DEAL)}>
                  <Plus className="mr-2 h-4 w-4" />New Deal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Deal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Property Address *</Label>
                    <Input placeholder="e.g. 12 Maple Street, Manchester, M1 1AA"
                      value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rightmove URL</Label>
                    <Input placeholder="https://www.rightmove.co.uk/properties/…"
                      value={form.rightmoveUrl} onChange={e => setForm(p => ({ ...p, rightmoveUrl: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Asking Price (£)</Label>
                      <Input type="number" placeholder="250000"
                        value={form.askingPrice} onChange={e => setForm(p => ({ ...p, askingPrice: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bedrooms</Label>
                      <Input type="number" placeholder="3"
                        value={form.bedrooms} onChange={e => setForm(p => ({ ...p, bedrooms: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Property Type</Label>
                    <Select value={form.propertyType} onValueChange={v => setForm(p => ({ ...p, propertyType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {["Terraced", "Semi-detached", "Detached", "Flat / Apartment", "Bungalow", "HMO", "Commercial", "Other"]
                          .map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={saving || !form.address.trim()}>
                      {saving ? "Creating…" : "Create & Open"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 bg-muted/50" placeholder="Search deals…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-sm border-border/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Type / Beds</TableHead>
                  <TableHead>Asking Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
                        <Target className="h-10 w-10 opacity-20" />
                        <p className="text-sm">No deals yet.{!isReadOnly && " Click 'New Deal' to start tracking a property."}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(deal => {
                    const meta = STATUS_META[deal.status] ?? STATUS_META.criteria_check;
                    return (
                      <TableRow key={deal.id} className="cursor-pointer hover:bg-muted/30"
                        onClick={() => navigate(`/deals/${deal.id}`)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{deal.address}</span>
                            {deal.rightmoveUrl && (
                              <a href={deal.rightmoveUrl} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-muted-foreground hover:text-primary transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[deal.propertyType, deal.bedrooms ? `${deal.bedrooms} bed` : null].filter(Boolean).join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{fmt(deal.askingPrice)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(deal.createdAt), "d MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={e => { e.stopPropagation(); navigate(`/deals/${deal.id}`); }}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            {!isReadOnly && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive"
                                onClick={e => { e.stopPropagation(); setDeleteId(deal.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this deal?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete all analysis data for this deal.</AlertDialogDescription>
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
