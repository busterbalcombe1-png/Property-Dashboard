import { useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Edit2, Trash2, Users, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { 
  useListTenants, 
  useCreateTenant, 
  useUpdateTenant, 
  useDeleteTenant,
  getListTenantsQueryKey,
  useListProperties,
  type Tenant
} from "@workspace/api-client-react";

import { AppLayout } from "@/components/layout/app-layout";
import { exportToCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const tenantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  propertyId: z.coerce.number().min(1, "Property selection is required"),
  leaseStart: z.string().min(1, "Lease start date is required"),
  leaseEnd: z.string().min(1, "Lease end date is required"),
  monthlyRent: z.coerce.number().min(0),
  depositPaid: z.coerce.number().min(0),
  status: z.enum(["active", "inactive", "pending"]),
  notes: z.string().optional()
});

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

function StatusBadge({ status }: { status: string }) {
  switch(status) {
    case 'active': return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>;
    case 'inactive': return <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-500/20">Inactive</Badge>;
    case 'pending': return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">Pending</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Tenants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { data: tenants, isLoading } = useListTenants();
  const { data: properties } = useListProperties();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const createMutation = useCreateTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Tenant added successfully" });
      }
    }
  });

  const updateMutation = useUpdateTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        setDialogOpen(false);
        setEditingTenant(null);
        toast({ title: "Tenant updated successfully" });
      }
    }
  });

  const deleteMutation = useDeleteTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        setDeleteId(null);
        toast({ title: "Tenant deleted" });
      }
    }
  });

  const form = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      propertyId: 0,
      leaseStart: new Date().toISOString().split('T')[0],
      leaseEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      monthlyRent: 0,
      depositPaid: 0,
      status: "active",
      notes: ""
    }
  });

  const handleOpenEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    form.reset({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone,
      propertyId: tenant.propertyId,
      leaseStart: tenant.leaseStart.split('T')[0],
      leaseEnd: tenant.leaseEnd.split('T')[0],
      monthlyRent: tenant.monthlyRent,
      depositPaid: tenant.depositPaid,
      status: tenant.status,
      notes: tenant.notes || ""
    });
    setDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingTenant(null);
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      propertyId: 0,
      leaseStart: new Date().toISOString().split('T')[0],
      leaseEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      monthlyRent: 0,
      depositPaid: 0,
      status: "active",
      notes: ""
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof tenantSchema>) => {
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  const filteredData = tenants?.filter(t => 
    `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Tenants</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage tenant profiles and lease agreements.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-card shadow-sm hover-elevate" onClick={() => tenants && exportToCsv(tenants, 'tenants')} disabled={!tenants?.length}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if(!open) setEditingTenant(null);
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-sm hover-elevate active-elevate-2" onClick={handleOpenAdd}>
                  <Plus className="mr-2 h-4 w-4" /> Add Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
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
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lease Details</h4>
                        <div className="h-px w-full bg-border mt-2"></div>
                      </div>

                      <FormField control={form.control} name="propertyId" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Property</FormLabel>
                          <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Assign property" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {properties?.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>{p.address}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            </FormControl>
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
                        <FormItem><FormLabel>Lease Start</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />

                      <FormField control={form.control} name="leaseEnd" render={({ field }) => (
                        <FormItem><FormLabel>Lease End</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />

                      <FormField control={form.control} name="monthlyRent" render={({ field }) => (
                        <FormItem><FormLabel>Monthly Rent (£)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      
                      <FormField control={form.control} name="depositPaid" render={({ field }) => (
                        <FormItem><FormLabel>Deposit Paid (£)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {editingTenant ? 'Save Changes' : 'Add Tenant'}
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
              placeholder="Search by name or property..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md bg-muted/50 focus-visible:bg-background"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Tenant Name</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Lease Ends</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p>No tenants found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData?.map((tenant) => (
                    <TableRow
                      key={tenant.id}
                      className="hover:bg-muted/30 cursor-pointer group"
                      onClick={() => navigate(`/tenants/${tenant.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {tenant.firstName} {tenant.lastName}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={tenant.propertyAddress}>
                        {tenant.propertyAddress || 'Unassigned'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{tenant.email}</div>
                        <div className="text-xs">{tenant.phone}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(tenant.leaseEnd), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tenant.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(tenant.monthlyRent)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(tenant)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteId(tenant.id)}>
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
              This will permanently delete the tenant record and remove their data from our servers.
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
