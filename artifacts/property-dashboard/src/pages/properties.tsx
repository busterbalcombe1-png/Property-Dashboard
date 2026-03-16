import { useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Edit2, Trash2, Home } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { 
  useListProperties, 
  useCreateProperty, 
  useUpdateProperty, 
  useDeleteProperty,
  getListPropertiesQueryKey,
  type Property,
  PropertyStatus
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const propertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  propertyType: z.string().min(1, "Property type is required"),
  bedrooms: z.coerce.number().min(0),
  purchasePrice: z.coerce.number().min(0),
  currentValue: z.coerce.number().min(0),
  monthlyRent: z.coerce.number().min(0),
  monthlyMortgage: z.coerce.number().min(0),
  monthlyExpenses: z.coerce.number().min(0),
  status: z.enum(["occupied", "vacant", "maintenance"]),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  notes: z.string().optional()
});

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

function StatusBadge({ status }: { status: string }) {
  switch(status) {
    case 'occupied': return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Occupied</Badge>;
    case 'vacant': return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">Vacant</Badge>;
    case 'maintenance': return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20">Maintenance</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Properties() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: properties, isLoading } = useListProperties();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const createMutation = useCreateProperty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
        setDialogOpen(false);
        toast({ title: "Property added successfully" });
      }
    }
  });

  const updateMutation = useUpdateProperty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
        setDialogOpen(false);
        setEditingProperty(null);
        toast({ title: "Property updated successfully" });
      }
    }
  });

  const deleteMutation = useDeleteProperty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
        setDeleteId(null);
        toast({ title: "Property deleted" });
      }
    }
  });

  const form = useForm<z.infer<typeof propertySchema>>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      address: "",
      propertyType: "Terraced",
      bedrooms: 0,
      purchasePrice: 0,
      currentValue: 0,
      monthlyRent: 0,
      monthlyMortgage: 0,
      monthlyExpenses: 0,
      status: "vacant",
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: ""
    }
  });

  const handleOpenEdit = (prop: Property) => {
    setEditingProperty(prop);
    form.reset({
      address: prop.address,
      propertyType: prop.propertyType,
      bedrooms: prop.bedrooms,
      purchasePrice: prop.purchasePrice,
      currentValue: prop.currentValue,
      monthlyRent: prop.monthlyRent,
      monthlyMortgage: prop.monthlyMortgage,
      monthlyExpenses: prop.monthlyExpenses,
      status: prop.status,
      purchaseDate: prop.purchaseDate.split('T')[0],
      notes: prop.notes || ""
    });
    setDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingProperty(null);
    form.reset({
      address: "",
      propertyType: "Terraced",
      bedrooms: 1,
      purchasePrice: 0,
      currentValue: 0,
      monthlyRent: 0,
      monthlyMortgage: 0,
      monthlyExpenses: 0,
      status: "vacant",
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: ""
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof propertySchema>) => {
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  const filteredData = properties?.filter(p => 
    p.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.propertyType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Properties</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your real estate assets and financials.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="bg-card shadow-sm hover-elevate"
              onClick={() => properties && exportToCsv(properties, 'properties')}
              disabled={!properties?.length}
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if(!open) setEditingProperty(null);
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-sm hover-elevate active-elevate-2" onClick={handleOpenAdd}>
                  <Plus className="mr-2 h-4 w-4" /> Add Property
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Property Address</FormLabel>
                          <FormControl><Input placeholder="123 High St..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormField control={form.control} name="propertyType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <FormControl><Input placeholder="Semi-detached, Flat..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormField control={form.control} name="bedrooms" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="occupied">Occupied</SelectItem>
                              <SelectItem value="vacant">Vacant</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="md:col-span-2 mt-4 mb-2">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Financials</h4>
                        <div className="h-px w-full bg-border mt-2"></div>
                      </div>

                      <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price (£)</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="currentValue" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Value (£)</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="monthlyRent" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent (£)</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="monthlyMortgage" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Mortgage (£)</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormField control={form.control} name="monthlyExpenses" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Monthly Exp. (£)</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {editingProperty ? 'Save Changes' : 'Add Property'}
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
              placeholder="Search properties by address or type..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md bg-muted/50 focus-visible:bg-background"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="text-right">Cashflow</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Home className="h-8 w-8 text-muted-foreground/50" />
                        <p>No properties found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData?.map((property) => (
                    <TableRow key={property.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{property.address}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {property.propertyType} • {property.bedrooms} beds
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={property.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(property.currentValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(property.monthlyRent)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-500">
                        {formatCurrency(property.monthlyRent - property.monthlyMortgage - property.monthlyExpenses)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(property)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteId(property.id)}>
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
              This will permanently delete the property and remove its data from our servers.
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
