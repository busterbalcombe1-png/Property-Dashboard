import { useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Edit2, Trash2, Wrench } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { 
  useListMaintenance, 
  useCreateMaintenance, 
  useUpdateMaintenance, 
  useDeleteMaintenance,
  getListMaintenanceQueryKey,
  useListProperties,
  type MaintenanceRequest
} from "@workspace/api-client-react";

import { AppLayout } from "@/components/layout/app-layout";
import { exportToCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const maintenanceSchema = z.object({
  propertyId: z.coerce.number().min(1, "Property selection is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["plumbing", "electrical", "structural", "appliances", "general", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
  estimatedCost: z.coerce.number().min(0),
  actualCost: z.coerce.number().min(0).optional(),
  reportedDate: z.string().min(1, "Reported date is required"),
  completedDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional()
});

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

function PriorityBadge({ priority }: { priority: string }) {
  switch(priority) {
    case 'urgent': return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20">Urgent</Badge>;
    case 'high': return <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20">High</Badge>;
    case 'medium': return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">Medium</Badge>;
    case 'low': return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">Low</Badge>;
    default: return <Badge variant="outline">{priority}</Badge>;
  }
}

function StatusBadge({ status }: { status: string }) {
  switch(status) {
    case 'open': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">Open</Badge>;
    case 'in_progress': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">In Progress</Badge>;
    case 'completed': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Completed</Badge>;
    case 'cancelled': return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Maintenance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useListMaintenance();
  const { data: properties } = useListProperties();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  const createMutation = useCreateMaintenance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });
        setDialogOpen(false);
        toast({ title: "Maintenance ticket created" });
      }
    }
  });

  const updateMutation = useUpdateMaintenance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });
        setDialogOpen(false);
        setEditingRequest(null);
        toast({ title: "Maintenance ticket updated" });
      }
    }
  });

  const deleteMutation = useDeleteMaintenance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });
        setDeleteId(null);
        toast({ title: "Ticket deleted" });
      }
    }
  });

  const form = useForm<z.infer<typeof maintenanceSchema>>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      propertyId: 0,
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      status: "open",
      estimatedCost: 0,
      actualCost: 0,
      reportedDate: new Date().toISOString().split('T')[0],
      completedDate: "",
      notes: ""
    }
  });

  const handleOpenEdit = (req: MaintenanceRequest) => {
    setEditingRequest(req);
    form.reset({
      propertyId: req.propertyId,
      title: req.title,
      description: req.description,
      category: req.category,
      priority: req.priority,
      status: req.status,
      estimatedCost: req.estimatedCost,
      actualCost: req.actualCost || 0,
      reportedDate: req.reportedDate.split('T')[0],
      completedDate: req.completedDate ? req.completedDate.split('T')[0] : "",
      notes: req.notes || ""
    });
    setDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingRequest(null);
    form.reset({
      propertyId: 0,
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      status: "open",
      estimatedCost: 0,
      actualCost: 0,
      reportedDate: new Date().toISOString().split('T')[0],
      completedDate: "",
      notes: ""
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof maintenanceSchema>) => {
    // clean up empty string dates
    const data = { ...values, completedDate: values.completedDate || undefined };
    if (editingRequest) {
      updateMutation.mutate({ id: editingRequest.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const filteredData = requests?.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Maintenance</h1>
            <p className="text-muted-foreground mt-1 text-sm">Track repairs, issues and maintenance tickets.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-card shadow-sm hover-elevate" onClick={() => requests && exportToCsv(requests, 'maintenance')} disabled={!requests?.length}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if(!open) setEditingRequest(null);
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-sm hover-elevate active-elevate-2" onClick={handleOpenAdd}>
                  <Plus className="mr-2 h-4 w-4" /> New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRequest ? 'Edit Ticket' : 'Create Maintenance Ticket'}</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Issue Title</FormLabel><FormControl><Input placeholder="E.g. Leaking sink..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea className="resize-none" rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />

                      <FormField control={form.control} name="propertyId" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Property</FormLabel>
                          <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {properties?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.address}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="plumbing">Plumbing</SelectItem>
                              <SelectItem value="electrical">Electrical</SelectItem>
                              <SelectItem value="structural">Structural</SelectItem>
                              <SelectItem value="appliances">Appliances</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="priority" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="reportedDate" render={({ field }) => (
                        <FormItem><FormLabel>Reported Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />

                      <FormField control={form.control} name="estimatedCost" render={({ field }) => (
                        <FormItem><FormLabel>Est. Cost (£)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      
                      <FormField control={form.control} name="actualCost" render={({ field }) => (
                        <FormItem><FormLabel>Actual Cost (£)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />

                      <FormField control={form.control} name="completedDate" render={({ field }) => (
                        <FormItem><FormLabel>Completed Date (Optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {editingRequest ? 'Save Changes' : 'Create Ticket'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="p-4 border-b border-border/50">
            <Input 
              placeholder="Search tickets by title or property..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md bg-muted/50 focus-visible:bg-background"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Wrench className="h-8 w-8 text-muted-foreground/50" />
                        <p>No maintenance tickets found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData?.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="font-medium text-foreground">{req.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">{req.category}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={req.propertyAddress}>
                        {req.propertyAddress || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={req.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(req.reportedDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(req.estimatedCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(req)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteId(req.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the maintenance ticket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
