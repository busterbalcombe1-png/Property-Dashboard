import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, getDay, differenceInDays, parseISO, isBefore
} from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays, Trash2, Edit2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type CalendarEvent = {
  id: string;
  dbId?: number;
  title: string;
  date: string;
  type: "compliance" | "lease_start" | "lease_end" | "task";
  subtype?: string;
  propertyId?: number;
  propertyAddress?: string;
  tenantName?: string;
  description?: string;
  priority?: string;
};

const EVENT_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  compliance: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/30", dot: "bg-amber-500" },
  lease_start: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/30", dot: "bg-emerald-500" },
  lease_end:   { bg: "bg-rose-50 dark:bg-rose-500/10",   text: "text-rose-700 dark:text-rose-400",   border: "border-rose-200 dark:border-rose-500/30",   dot: "bg-rose-500" },
  task:        { bg: "bg-blue-50 dark:bg-blue-500/10",   text: "text-blue-700 dark:text-blue-400",   border: "border-blue-200 dark:border-blue-500/30",   dot: "bg-blue-500" },
};

function urgencyLabel(date: string): { label: string; color: string } | null {
  const d = parseISO(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInDays(d, today);
  if (diff < 0) return { label: "Overdue", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
  if (diff <= 14) return { label: `${diff}d`, color: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
  if (diff <= 30) return { label: `${diff}d`, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  if (diff <= 60) return { label: `${Math.round(diff / 7)}w`, color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" };
  return null;
}

function EventChip({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  const s = EVENT_STYLES[event.type] ?? EVENT_STYLES.task;
  return (
    <div className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium truncate ${s.bg} ${s.text} border ${s.border}`}>
      <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className="truncate">{compact ? (event.subtype ?? event.type.replace("_", " ")) : event.title}</span>
    </div>
  );
}

function EventCard({ event, onEdit, onDelete, isReadOnly }: { event: CalendarEvent; onEdit?: (e: CalendarEvent) => void; onDelete?: (e: CalendarEvent) => void; isReadOnly: boolean }) {
  const s = EVENT_STYLES[event.type] ?? EVENT_STYLES.task;
  const urg = urgencyLabel(event.date);
  return (
    <div className={`rounded-lg border p-3 ${s.bg} ${s.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${s.text}`}>{event.title}</span>
            {urg && <Badge className={`text-[10px] px-1.5 py-0 h-4 ${urg.color}`}>{urg.label}</Badge>}
          </div>
          {event.propertyAddress && <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.propertyAddress}</p>}
          {event.tenantName && <p className="text-xs text-muted-foreground mt-0.5">{event.tenantName}</p>}
          {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
        </div>
        {!isReadOnly && event.type === "task" && event.dbId && (
          <div className="flex gap-1 shrink-0">
            {onEdit && <button onClick={() => onEdit(event)} className="p-1 text-muted-foreground/50 hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>}
            {onDelete && <button onClick={() => onDelete(event)} className="p-1 text-muted-foreground/50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>}
          </div>
        )}
      </div>
    </div>
  );
}

function AddEventModal({ initial, properties, onClose, onSave }: {
  initial?: CalendarEvent | null;
  properties: { id: number; address: string }[];
  onClose: () => void;
  onSave: (data: { title: string; date: string; type: string; description: string; propertyId?: number; priority: string }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [propertyId, setPropertyId] = useState<string>(initial?.propertyId?.toString() ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? "normal");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{initial ? "Edit Task" : "Add Task"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Annual inspection" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Date *</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Priority</Label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Property (optional)</Label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— None —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any additional details…" rows={3} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={() => {
            if (!title.trim() || !date) return;
            onSave({ title: title.trim(), date, type: "task", description, propertyId: propertyId ? parseInt(propertyId) : undefined, priority });
          }}>
            {initial ? "Save Changes" : "Add Task"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { toast } = useToast();
  const { isReadOnly } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  const { data: rawEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-aggregate"],
    queryFn: () => fetch(`${API_BASE}/api/calendar/aggregate`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  });
  const events: CalendarEvent[] = Array.isArray(rawEvents) ? rawEvents : [];

  const { data: rawProperties } = useQuery<{ id: number; address: string }[]>({
    queryKey: ["properties-list"],
    queryFn: () => fetch(`${API_BASE}/api/properties`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  });
  const properties: { id: number; address: string }[] = Array.isArray(rawProperties) ? rawProperties : [];

  const createEvent = useMutation({
    mutationFn: (data: object) => fetch(`${API_BASE}/api/calendar-events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["calendar-aggregate"] }); toast({ title: "Task added" }); },
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => fetch(`${API_BASE}/api/calendar-events/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["calendar-aggregate"] }); toast({ title: "Task updated" }); },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => fetch(`${API_BASE}/api/calendar-events/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["calendar-aggregate"] }); toast({ title: "Task deleted" }); },
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDow = getDay(monthStart);
  const leadingBlanks = startDow === 0 ? 6 : startDow - 1;

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEvents = selectedDateStr ? (eventsByDate.get(selectedDateStr) ?? []) : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = useMemo(() => {
    return events
      .filter(e => {
        const d = parseISO(e.date);
        const diff = differenceInDays(d, today);
        return diff >= -1 && diff <= 90;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 20);
  }, [events]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const handleAddOnDay = (day: Date) => {
    setDefaultDate(format(day, "yyyy-MM-dd"));
    setShowAddModal(true);
  };

  const handleSave = (data: object) => {
    if (editEvent?.dbId) {
      updateEvent.mutate({ id: editEvent.dbId, data });
    } else {
      createEvent.mutate(data);
    }
    setShowAddModal(false);
    setEditEvent(null);
    setDefaultDate(null);
  };

  const handleDelete = (e: CalendarEvent) => {
    if (e.dbId) deleteEvent.mutate(e.dbId);
  };

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Business Calendar</h1>
            <p className="text-muted-foreground mt-1 text-sm">Compliance deadlines, lease dates and key tasks — all in one place.</p>
          </div>
          {!isReadOnly && (
            <Button onClick={() => { setDefaultDate(format(new Date(), "yyyy-MM-dd")); setShowAddModal(true); }} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />Add Task
            </Button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {[
            { label: "Compliance", style: EVENT_STYLES.compliance },
            { label: "Lease Start", style: EVENT_STYLES.lease_start },
            { label: "Lease End",   style: EVENT_STYLES.lease_end },
            { label: "Task",        style: EVENT_STYLES.task },
          ].map(({ label, style }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="xl:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
                    Today
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div key={`blank-${i}`} className="bg-muted/20 min-h-[80px] sm:min-h-[90px]" />
                ))}
                {days.map(day => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDate.get(key) ?? [];
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isCurrentDay = isToday(day);
                  const isPast = isBefore(day, today) && !isCurrentDay;
                  return (
                    <div
                      key={key}
                      onClick={() => handleDayClick(day)}
                      className={`bg-background min-h-[80px] sm:min-h-[90px] p-1.5 cursor-pointer transition-colors hover:bg-muted/40 relative flex flex-col gap-0.5
                        ${isSelected ? "ring-2 ring-inset ring-primary" : ""}
                        ${isPast ? "opacity-60" : ""}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                          ${isCurrentDay ? "bg-primary text-primary-foreground" : "text-foreground"}
                        `}>
                          {format(day, "d")}
                        </span>
                        {!isReadOnly && dayEvents.length === 0 && (
                          <button
                            onClick={e => { e.stopPropagation(); handleAddOnDay(day); }}
                            className="opacity-0 hover:opacity-100 group-hover:opacity-100 text-muted-foreground/40 hover:text-muted-foreground transition-opacity p-0.5"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map(e => (
                          <EventChip key={e.id} event={e} compact />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {/* Selected day */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {selectedDate ? format(selectedDate, "EEEE, d MMMM") : "Select a day"}
                  </CardTitle>
                  {!isReadOnly && selectedDate && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => handleAddOnDay(selectedDate)}>
                      <Plus className="h-3.5 w-3.5" />Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
                    <CalendarDays className="h-8 w-8 opacity-20" />
                    <p className="text-xs">Nothing scheduled</p>
                    {!isReadOnly && selectedDate && (
                      <Button variant="ghost" size="sm" className="text-xs mt-1 gap-1" onClick={() => handleAddOnDay(selectedDate)}>
                        <Plus className="h-3 w-3" />Add task
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedEvents.map(e => (
                      <EventCard key={e.id} event={e} onEdit={ev => { setEditEvent(ev); setShowAddModal(true); }} onDelete={handleDelete} isReadOnly={isReadOnly} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card className="border-border/50 shadow-sm flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Coming Up (90 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nothing in the next 90 days</p>
                ) : (
                  <div className="flex flex-col divide-y divide-border/50">
                    {upcoming.map(e => {
                      const s = EVENT_STYLES[e.type] ?? EVENT_STYLES.task;
                      const urg = urgencyLabel(e.date);
                      const d = parseISO(e.date);
                      const diff = differenceInDays(d, today);
                      return (
                        <div
                          key={e.id}
                          className="py-2.5 flex items-start gap-3 cursor-pointer hover:bg-muted/30 rounded-md px-1 transition-colors"
                          onClick={() => { setSelectedDate(parseISO(e.date)); setCurrentMonth(parseISO(e.date)); }}
                        >
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{e.title}</p>
                            {(e.propertyAddress || e.tenantName) && (
                              <p className="text-[11px] text-muted-foreground truncate">{e.propertyAddress ?? e.tenantName}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className="text-[11px] text-muted-foreground">{format(d, "d MMM")}</span>
                            {urg && <Badge className={`text-[9px] px-1 py-0 h-3.5 ${urg.color}`}>{urg.label}</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {(showAddModal || editEvent) && (
        <AddEventModal
          initial={editEvent ? { ...editEvent, date: editEvent.date } : (defaultDate ? { id: "", title: "", date: defaultDate, type: "task" } : null)}
          properties={properties}
          onClose={() => { setShowAddModal(false); setEditEvent(null); setDefaultDate(null); }}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
