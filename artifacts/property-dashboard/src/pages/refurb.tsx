import { useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Edit2, Trash2, Hammer } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { 
  useListRefurb, 
  useCreateRefurb, 
  useUpdateRefurb, 
  useDeleteRefurb,
  getListRefurbQueryKey,
  useListProperties,
  type RefurbProject
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

const refurbSchema = z.object({
  propertyId: z.coerce.number().min(1, "Property selection is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["planned", "in_progress", "completed", "on_hold"]),
  budget: z.coerce.number().min(0),
  actualCost: z.coerce.number().min(0).optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  contractor: z.string().optional(),
  notes: z.string().optional()
});

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

function StatusBadge({ status }: { status: string }) {
  switch(status) {
    case 'planned': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">Planned</Badge>;
    case 'in_progress': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">In Progress</Badge>;
    case 'completed': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Completed</Badge>;
    case 'on_hold': return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20">On Hold</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function RefurbTracker() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useListRefurb();
  const { data: properties } = useListProperties();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<RefurbProject | null>(null);

  const createMutation = useCreateRefurb({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRefurbQueryKey() });
        setDialogOpen(false);
        toast({ title: "Project added successfully" });
      }
    }
  });

  const updateMutation = useUpdateRefurb({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRefurbQueryKey() });
        setDialogOpen(false);
        setEditingProject(null);
        toast({ title: "Project updated successfully" });
      }
    }
  });

  const deleteMutation = useDeleteRefurb({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRefurbQueryKey() });
        setDeleteId(null);
        toast({ title: "Project deleted" });
      }
    }
  });

  const form = useForm<z.infer<typeof refurbSchema>>({
    resolver: zodResolver(refurbSchema),
    defaultValues: {
      propertyId: 0,
      title: "",
      description: "",
      status: "planned",
      budget: 0,
      actualCost: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      contractor: "",
      notes: ""
    }
  });

  const handleOpenEdit = (proj: RefurbProject) => {
    setEditingProject(proj);
    form.reset({
      propertyId: proj.propertyId,
      title: proj.title,
      description: proj.description,
      status: proj.status,
      budget: proj.budget,
      actualCost: proj.actualCost || 0,
      startDate: proj.startDate.split('T')[0],
      endDate: proj.endDate ? proj.endDate.split('T')[0] : "",
      contractor: proj.contractor || "",
      notes: proj.notes || ""
    });
    setDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingProject(null);
    form.reset({
      propertyId: 0,
      title: "",
      description: "",
      status: "planned",
      budget: 0,
      actualCost: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      contractor: "",
      notes: ""
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof refurbSchema>) => {
    const data = { ...values, endDate: values.endDate || undefined };
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const filteredData = projects?.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Refurb Tracker</h1>
            <p className="text-muted-foreground mt-1 text-sm">Monitor renovation projects, budgets, and timelines.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-card shadow-sm hover-elevate" onClick={() => projects && exportToCsv(projects, 'refurb-projects')} disabled={!projects?.length}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if(!open) setEditingProject(null);
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-sm hover-elevate active-elevate-2" onClick={handleOpenAdd}>
                  <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProject ? 'Edit Project' : 'New Refurbishment Project'}</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Project Title</FormLabel><FormControl><Input placeholder="E.g. Kitchen Renovation..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Scope of Work</FormLabel><FormControl><Textarea className="resize-none" rows={3} {...field} /></FormControl><FormMessage /></FormItem>
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

                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="planned">Planned</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="contractor" render={({ field }) => (
                        <FormItem><FormLabel>Contractor / Builder</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />

                      <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />

                      <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem><FormLabel>End Date (Optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                      )} />

                      <FormField control={form.control} name="budget" render={({ field }) => (
                        <FormItem><FormLabel>Allocated Budget (£)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      
                      <FormField control={form.control} name="actualCost" render={({ field }) => (
                        <FormItem><FormLabel>Actual Spend (£)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {editingProject ? 'Save Changes' : 'Create Project'}
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
              placeholder="Search projects by title or property..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md bg-muted/50 focus-visible:bg-background"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Hammer className="h-8 w-8 text-muted-foreground/50" />
                        <p>No refurb projects found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData?.map((proj) => {
                    const variance = proj.budget - (proj.actualCost || 0);
                    const overBudget = variance < 0;
                    
                    return (
                      <TableRow key={proj.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="font-medium text-foreground">{proj.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(proj.startDate), 'MMM d, yyyy')}
                            {proj.endDate && ` - ${format(new Date(proj.endDate), 'MMM d, yyyy')}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate" title={proj.propertyAddress}>
                          {proj.propertyAddress || 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={proj.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(proj.budget)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(proj.actualCost || 0)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${overBudget ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {overBudget ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(proj)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteId(proj.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the refurb project and its financial tracking.
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
