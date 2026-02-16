import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Truck, MapPin, Clock, Package, Plus, CalendarDays, Check, ShoppingCart,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { t, formatTime, formatDateTime } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Trip, Order, Vehicle } from "@shared/schema";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDateRange(center: Date, days: number) {
  const result: Date[] = [];
  for (let i = -Math.floor(days / 2); i <= Math.floor(days / 2); i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    result.push(d);
  }
  return result;
}

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const dayAbbrevKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function DateStrip({ selectedDate, onSelect }: { selectedDate: Date; onSelect: (d: Date) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasMoved = useRef(false);
  const today = new Date();
  const dates = getDateRange(today, 30);

  useEffect(() => {
    if (scrollRef.current) {
      const selected = scrollRef.current.querySelector("[data-selected='true']") as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ inline: "center", behavior: "auto", block: "nearest" });
      }
    }
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    const walk = x - startX.current;
    if (Math.abs(walk) > 3) hasMoved.current = true;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseLeave = () => { isDragging.current = false; };

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto pb-1.5 cursor-grab active:cursor-grabbing select-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      data-testid="date-strip"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {dates.map(d => {
        const isToday = isSameDay(d, today);
        const isSelected = isSameDay(d, selectedDate);
        const dayOfWeek = d.getDay();
        const dayAbbr = t(`housekeepingSection.${dayAbbrevKeys[dayOfWeek]}`);
        const dateNum = d.getDate();
        return (
          <button
            key={getDateStr(d)}
            data-selected={isSelected ? "true" : "false"}
            className={`flex flex-col items-center justify-center min-w-[3rem] h-[3.5rem] px-1 rounded-md transition-colors flex-shrink-0 ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : isToday
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover-elevate"
            }`}
            onClick={() => { if (!hasMoved.current) onSelect(d); }}
            data-testid={`date-${getDateStr(d)}`}
          >
            <span className="text-[10px] font-medium leading-none mb-0.5">{dayAbbr}</span>
            <span className="text-base font-bold leading-none">{dateNum}</span>
            <div className="h-1.5 mt-0.5 flex items-center justify-center">
              {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-primary" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  useLang();
  const variants: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    started: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    waiting: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };
  return (
    <Badge className={`no-default-hover-elevate no-default-active-elevate ${variants[status] || ""}`}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export default function DriverHomePage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tripDate, setTripDate] = useState("");
  const [tripHour, setTripHour] = useState("09");
  const [tripMinute, setTripMinute] = useState("00");
  const [tripDuration, setTripDuration] = useState("30");
  const [tripVehicleId, setTripVehicleId] = useState("");
  const [tripNotes, setTripNotes] = useState("");

  const dateStr = getDateStr(selectedDate);

  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    refetchInterval: 15000,
  });
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 15000,
  });
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const driverName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : "";

  const createPersonalTrip = useMutation({
    mutationFn: async () => {
      const selectedDateStr = tripDate || dateStr;
      const departureTime = new Date(`${selectedDateStr}T${tripHour}:${tripMinute}:00`);
      await apiRequest("POST", "/api/trips", {
        personName: driverName,
        location: t("trips.personal"),
        departureTime: departureTime.toISOString(),
        estimatedDuration: parseInt(tripDuration),
        vehicleId: tripVehicleId && tripVehicleId !== "none" ? parseInt(tripVehicleId) : null,
        notes: tripNotes || null,
        isPersonal: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({ title: t("trips.tripAdded") });
      setDialogOpen(false);
      setTripDate("");
      setTripHour("09");
      setTripMinute("00");
      setTripDuration("30");
      setTripVehicleId("");
      setTripNotes("");
    },
    onError: () => {
      toast({ title: t("trips.saveFailed"), variant: "destructive" });
    },
  });

  const dayTrips = trips.filter(tr => {
    if (!tr.departureTime) return false;
    const tripDate = new Date(tr.departureTime);
    return getDateStr(tripDate) === dateStr;
  });

  const dayOrders = orders.filter(o => {
    if (!["approved", "in_progress", "completed"].includes(o.status)) return false;
    if (!o.createdAt) return false;
    const orderDate = new Date(o.createdAt);
    return getDateStr(orderDate) === dateStr;
  });

  const completedTrips = dayTrips.filter(tr => tr.status === "completed").length;
  const completedOrders = dayOrders.filter(o => o.status === "completed").length;
  const totalItems = dayTrips.length + dayOrders.length;
  const doneItems = completedTrips + completedOrders;

  type ScheduleItem = { type: "trip"; data: Trip; time: Date } | { type: "order"; data: Order; time: Date };
  const scheduleItems: ScheduleItem[] = [
    ...dayTrips.map(tr => ({ type: "trip" as const, data: tr, time: new Date(tr.departureTime) })),
    ...dayOrders.map(o => ({ type: "order" as const, data: o, time: new Date(o.createdAt!) })),
  ].sort((a, b) => {
    const statusA = a.type === "trip" ? a.data.status : a.data.status;
    const statusB = b.type === "trip" ? b.data.status : b.data.status;
    const isCompletedA = statusA === "completed" ? 1 : 0;
    const isCompletedB = statusB === "completed" ? 1 : 0;
    if (isCompletedA !== isCompletedB) return isCompletedA - isCompletedB;
    return a.time.getTime() - b.time.getTime();
  });

  const isLoading = tripsLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="page-driver-home">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const durationOptions = [15, 30, 45, 60, 75, 90, 105, 120];

  return (
    <div className="space-y-5" data-testid="page-driver-home">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Truck className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" data-testid="text-driver-schedule-title">{t("driverHome.todaySchedule")}</h2>
            <p className="text-sm text-muted-foreground">
              {doneItems}/{totalItems} {t("driverHome.completed")}
            </p>
          </div>
          {totalItems > 0 && (
            <div className="flex-shrink-0">
              <div className="w-14 h-14 relative flex items-center justify-center">
                <svg className="absolute inset-0 w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                    strokeDasharray={`${(doneItems / totalItems) * 150.8} 150.8`}
                    strokeLinecap="round" />
                </svg>
                <span className="text-sm font-bold relative" data-testid="text-progress-percent">{Math.round((doneItems / totalItems) * 100)}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-base font-bold">{t("driverHome.todaySchedule")}</h3>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-add-personal-trip">
                <Plus className="w-4 h-4" />
                {t("trips.addPersonalTrip")}
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-personal-trip">
              <DialogHeader>
                <DialogTitle>{t("trips.addPersonalTrip")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("trips.departureTime")} *</label>
                  <div className="flex items-center gap-2">
                    <Select value={tripHour} onValueChange={setTripHour}>
                      <SelectTrigger className="flex-1" data-testid="select-trip-hour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-lg font-bold">:</span>
                    <Select value={tripMinute} onValueChange={setTripMinute}>
                      <SelectTrigger className="flex-1" data-testid="select-trip-minute">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["00", "15", "30", "45"].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={tripDate || dateStr} onValueChange={setTripDate}>
                    <SelectTrigger data-testid="select-trip-date">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getDateRange(new Date(), 30).map(d => {
                        const ds = getDateStr(d);
                        const dayKey = dayAbbrevKeys[d.getDay()];
                        return (
                          <SelectItem key={ds} value={ds}>
                            {ds} ({t(`housekeepingSection.${dayKey}`)})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("trips.estimatedDuration")}</label>
                  <Select value={tripDuration} onValueChange={setTripDuration}>
                    <SelectTrigger data-testid="select-trip-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[15, 30, 45, 60, 75, 90, 105, 120].map(min => (
                        <SelectItem key={min} value={String(min)}>
                          {min} {t("trips.minutes")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("trips.vehicle")}</label>
                  <Select value={tripVehicleId} onValueChange={setTripVehicleId}>
                    <SelectTrigger data-testid="select-trip-vehicle">
                      <SelectValue placeholder={t("trips.noVehicle")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("trips.noVehicle")}</SelectItem>
                      {vehicles.filter(v => !v.isPrivate || v.assignedUserId === user?.id).map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("fields.notes")}</label>
                  <Input
                    value={tripNotes}
                    onChange={e => setTripNotes(e.target.value)}
                    placeholder={t("fields.notes")}
                    data-testid="input-trip-notes"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => createPersonalTrip.mutate()}
                    disabled={createPersonalTrip.isPending}
                    data-testid="button-submit-personal-trip"
                  >
                    {t("actions.submit")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel-personal-trip"
                  >
                    {t("actions.cancel")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {scheduleItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p className="text-base font-medium" data-testid="text-no-schedule">{t("driverHome.noSchedule")}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {scheduleItems.map(item => {
              if (item.type === "trip") {
                const trip = item.data;
                return (
                  <Card key={`trip-${trip.id}`} data-testid={`card-schedule-trip-${trip.id}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        trip.status === "completed" ? "bg-green-500/20" : "bg-blue-500/10"
                      }`}>
                        <MapPin className={`w-6 h-6 ${trip.status === "completed" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold">{trip.personName}</p>
                          {trip.isPersonal && (
                            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                              {t("trips.personal")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{trip.isPersonal ? "" : trip.location}</p>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(trip.departureTime)}</span>
                          {trip.estimatedDuration && (
                            <span> - {trip.estimatedDuration} {t("trips.minutes")}</span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={trip.status} />
                    </CardContent>
                  </Card>
                );
              } else {
                const order = item.data;
                return (
                  <Card key={`order-${order.id}`} data-testid={`card-schedule-order-${order.id}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        order.status === "completed" ? "bg-green-500/20" : "bg-purple-500/10"
                      }`}>
                        <ShoppingCart className={`w-6 h-6 ${order.status === "completed" ? "text-green-600 dark:text-green-400" : "text-purple-600 dark:text-purple-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">#{order.id}</p>
                        {order.notes && <p className="text-xs text-muted-foreground truncate">{order.notes}</p>}
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(order.createdAt)}</span>
                        </div>
                      </div>
                      <StatusBadge status={order.status} />
                    </CardContent>
                  </Card>
                );
              }
            })}
          </div>
        )}
      </div>

    </div>
  );
}
