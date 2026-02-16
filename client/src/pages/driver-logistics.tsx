import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Car, Play, Square, AlertTriangle, ListChecks, Wrench, Phone, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Trip, Vehicle, Technician } from "@shared/schema";
import { t, formatDateTime, formatTime } from "@/lib/i18n";
import { useLang } from "@/App";

type DriverAvailability = { busy: boolean; activeTrips: { id: number; personName: string; location: string; status: string }[]; activeOrders: { id: number; status: string }[] };

function WaitingTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return <span className="font-mono text-sm font-bold">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>;
}

function DriverTripsSection() {
  useLang();
  const { toast } = useToast();
  const { data: currentUser } = useQuery<{ id: string }>({ queryKey: ["/api/auth/user"] });
  const { data: trips, isLoading } = useQuery<Trip[]>({ queryKey: ["/api/trips"] });
  const { data: allVehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: driverAvailability } = useQuery<DriverAvailability>({
    queryKey: ["/api/drivers", currentUser?.id, "availability"],
    enabled: !!currentUser?.id,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/trips/${id}/status`, { status });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      if (currentUser?.id) queryClient.invalidateQueries({ queryKey: ["/api/drivers", currentUser.id, "availability"] });
      const msgKey = vars.status === "cancelled" ? "trips.tripCancelled" : vars.status === "started" ? "driver.tripStarted" : vars.status === "waiting" ? "driver.tripWaiting" : "driver.tripCompleted";
      toast({ title: t(msgKey) });
    },
  });

  const getVehicleName = (vid: number | null) => {
    if (!vid) return "";
    return allVehicles?.find(v => v.id === vid)?.name || "";
  };

  const formatWaiting = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} ${t("trips.minutes")} ${secs} ${t("trips.seconds")}`;
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  const approvedTrips = trips?.filter(tr => tr.status === "approved") || [];
  const startedTrips = trips?.filter(tr => tr.status === "started") || [];
  const waitingTrips = trips?.filter(tr => tr.status === "waiting") || [];
  const completedTrips = trips?.filter(tr => tr.status === "completed") || [];
  const activeTrips = [...startedTrips, ...waitingTrips];

  const tripStatusVariants: Record<string, string> = {
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    started: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    waiting: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };

  if (!approvedTrips.length && !activeTrips.length && !completedTrips.length) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">{t("trips.noTrips")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeTrips.map(trip => (
        <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{trip.personName}</span>
                {trip.isPersonal && (
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                    {t("trips.personal")}
                  </Badge>
                )}
              </div>
              <Badge className={`no-default-hover-elevate no-default-active-elevate ${tripStatusVariants[trip.status] || ""}`}>
                {t(`status.${trip.status}`)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {!trip.isPersonal && <div>{t("trips.location")}: {trip.location}</div>}
              <div className="flex items-center gap-2 flex-wrap">
                <Clock className="w-3 h-3" />
                {trip.isPersonal && trip.departureTime && trip.estimatedDuration ? (
                  <span className="text-foreground/80 font-medium">{formatTime(trip.departureTime)} - {formatTime(new Date(new Date(trip.departureTime).getTime() + trip.estimatedDuration * 60000))}</span>
                ) : (
                  <span className="text-foreground/80 font-medium">{formatDateTime(trip.departureTime)}</span>
                )}
              </div>
              {trip.vehicleId && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Car className="w-3 h-3" />
                  <span>{getVehicleName(trip.vehicleId)}</span>
                </div>
              )}
              {trip.notes && <div>{trip.notes}</div>}
            </div>
            {!trip.isPersonal && trip.status === "waiting" && trip.waitingStartedAt && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-900/20">
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm text-orange-700 dark:text-orange-300">{t("driver.waitingTime")}:</span>
                <WaitingTimer startedAt={trip.waitingStartedAt as unknown as string} />
              </div>
            )}
            {!trip.isPersonal && (
              <div className="flex gap-2 flex-wrap">
                {trip.status === "started" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => statusMutation.mutate({ id: trip.id, status: "waiting" })} disabled={statusMutation.isPending} data-testid={`button-wait-trip-${trip.id}`}>
                    <MapPin className="w-4 h-4" /> {t("driver.arrivedAtLocation")}
                  </Button>
                )}
                <Button size="sm" className="gap-1.5" onClick={() => statusMutation.mutate({ id: trip.id, status: "completed" })} disabled={statusMutation.isPending} data-testid={`button-complete-trip-${trip.id}`}>
                  <Square className="w-4 h-4" /> {t("driver.completeTrip")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {approvedTrips.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {t("status.approved")} ({approvedTrips.length})
          </h3>
          {approvedTrips.map(trip => (
            <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{trip.personName}</span>
                      {trip.isPersonal && (
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                          {t("trips.personal")}
                        </Badge>
                      )}
                    </div>
                    {!trip.isPersonal && <div className="text-sm text-muted-foreground">{trip.location}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`no-default-hover-elevate no-default-active-elevate ${tripStatusVariants.approved}`}>
                      {t("status.approved")}
                    </Badge>
                    {trip.createdBy === currentUser?.id && (!trip.departureTime || new Date(trip.departureTime) > new Date()) && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { if (confirm(t("messages.confirmDelete"))) statusMutation.mutate({ id: trip.id, status: "cancelled" }); }} data-testid={`button-cancel-trip-${trip.id}`}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <Clock className="w-3 h-3" />
                  {trip.isPersonal && trip.departureTime && trip.estimatedDuration ? (
                    <span className="text-foreground/80 font-medium">{formatTime(trip.departureTime)} - {formatTime(new Date(new Date(trip.departureTime).getTime() + trip.estimatedDuration * 60000))}</span>
                  ) : (
                    <span className="text-foreground/80 font-medium">{formatDateTime(trip.departureTime)}</span>
                  )}
                  {trip.vehicleId && (
                    <>
                      <Car className="w-3 h-3" />
                      <span>{getVehicleName(trip.vehicleId)}</span>
                    </>
                  )}
                </div>
                {trip.notes && <p className="text-sm text-muted-foreground">{trip.notes}</p>}
                {driverAvailability?.busy && (
                  <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" data-testid={`alert-trip-conflict-${trip.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-300">{t("conflict.driverBusy")}</span>
                    </div>
                  </div>
                )}
                {!trip.isPersonal && (
                  <Button size="sm" className="gap-1.5" onClick={() => statusMutation.mutate({ id: trip.id, status: "started" })} disabled={statusMutation.isPending} data-testid={`button-start-trip-${trip.id}`}>
                    <Play className="w-4 h-4" /> {t("driver.startTrip")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completedTrips.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <ListChecks className="w-4 h-4 text-green-600 dark:text-green-400" /> {t("status.completed")} ({completedTrips.length})
          </h3>
          {completedTrips.map(trip => (
            <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{trip.personName}</span>
                      {trip.isPersonal && (
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                          {t("trips.personal")}
                        </Badge>
                      )}
                    </div>
                    {!trip.isPersonal && <div className="text-sm text-muted-foreground">{trip.location}</div>}
                  </div>
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${tripStatusVariants.completed}`}>
                    {t("status.completed")}
                  </Badge>
                </div>
                {trip.isPersonal && trip.estimatedDuration ? (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {trip.departureTime && trip.estimatedDuration ? (
                      <span>{formatTime(trip.departureTime)} - {formatTime(new Date(new Date(trip.departureTime).getTime() + trip.estimatedDuration * 60000))} ({trip.estimatedDuration} {t("trips.minutes")})</span>
                    ) : (
                      <span>{t("trips.estimatedDuration")}: {trip.estimatedDuration} {t("trips.minutes")}</span>
                    )}
                  </div>
                ) : (
                  trip.waitingDuration && trip.waitingDuration > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("driver.waitingTime")}: {formatWaiting(trip.waitingDuration)}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DriverTechniciansSection() {
  useLang();
  const { data: technicians, isLoading } = useQuery<Technician[]>({ queryKey: ["/api/technicians"] });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  if (!technicians?.length) {
    return (
      <div className="text-center py-8">
        <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">{t("technicians.noTechnicians")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {technicians.map(tech => (
        <Card key={tech.id} data-testid={`card-technician-${tech.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="font-medium">{tech.name}</span>
                  <div>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">
                      {t(`technicians.${tech.specialty}`)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            {tech.notes && <p className="text-sm text-muted-foreground mb-2">{tech.notes}</p>}
            <a href={`tel:${tech.phone}`} data-testid={`link-call-tech-${tech.id}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Phone className="w-4 h-4" /> {t("technicians.call")} {tech.phone}
              </Button>
            </a>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DriverLogisticsPage() {
  useLang();
  const [activeTab, setActiveTab] = useState("trips");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-driver-logistics-title">
        <Car className="w-5 h-5 text-primary" />
        {t("nav.logisticsSection")}
      </h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start gap-1">
          <TabsTrigger value="trips" className="gap-1 shrink-0" data-testid="tab-driver-trips">
            <MapPin className="w-4 h-4" /> {t("nav.trips")}
          </TabsTrigger>
          <TabsTrigger value="technicians" className="gap-1 shrink-0" data-testid="tab-driver-technicians">
            <Wrench className="w-4 h-4" /> {t("nav.technicians")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="trips"><DriverTripsSection /></TabsContent>
        <TabsContent value="technicians"><DriverTechniciansSection /></TabsContent>
      </Tabs>
    </div>
  );
}
