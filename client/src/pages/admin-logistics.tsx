import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, MapPin, Clock, Wrench, Plus, Pencil, X, Check, Phone } from "lucide-react";
import { useState } from "react";
import type { Vehicle, Trip, Technician } from "@shared/schema";
import { t } from "@/lib/i18n";
import { useLang } from "@/App";
import type { AuthUser } from "@/hooks/use-auth";

const specialties = ["plumber", "farmer", "acTech", "electrician", "carpenter", "painter", "other"] as const;

function VehiclesSection() {
  useLang();
  const { toast } = useToast();
  const { data: allVehicles, isLoading } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [name, setName] = useState("");
  const [odometer, setOdometer] = useState("");
  const [lastMaintenance, setLastMaintenance] = useState("");

  const resetForm = () => { setName(""); setOdometer(""); setLastMaintenance(""); setEditingVehicle(null); };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v); setName(v.name); setOdometer(String(v.odometerReading || ""));
    setLastMaintenance(v.lastMaintenanceDate ? new Date(v.lastMaintenanceDate).toISOString().split("T")[0] : "");
    setShowAdd(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/vehicles", data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] }); setShowAdd(false); resetForm(); toast({ title: t("vehicles.vehicleAdded") }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/vehicles/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] }); setShowAdd(false); resetForm(); toast({ title: t("vehicles.vehicleUpdated") }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/vehicles/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] }); toast({ title: t("vehicles.vehicleDeleted") }); },
  });

  const handleSave = () => {
    const data = { name, odometerReading: odometer ? parseInt(odometer) : 0, lastMaintenanceDate: lastMaintenance ? new Date(lastMaintenance) : null };
    if (editingVehicle) updateMutation.mutate({ id: editingVehicle.id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-vehicle"><Plus className="w-4 h-4" /> {t("vehicles.addVehicle")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingVehicle ? t("vehicles.editVehicle") : t("vehicles.addVehicle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("vehicles.name")} value={name} onChange={e => setName(e.target.value)} data-testid="input-vehicle-name" />
            <Input type="number" placeholder={t("vehicles.odometer")} value={odometer} onChange={e => setOdometer(e.target.value)} data-testid="input-vehicle-odometer" />
            <Input type="date" placeholder={t("vehicles.lastMaintenance")} value={lastMaintenance} onChange={e => setLastMaintenance(e.target.value)} data-testid="input-vehicle-maintenance" />
            <Button className="w-full" disabled={!name || createMutation.isPending || updateMutation.isPending} data-testid="button-save-vehicle" onClick={handleSave}>
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!allVehicles?.length ? (
        <p className="text-center text-muted-foreground py-8">{t("vehicles.noVehicles")}</p>
      ) : (
        allVehicles.map(v => (
          <Card key={v.id} data-testid={`card-vehicle-${v.id}`}>
            <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{v.name}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex gap-3 flex-wrap">
                  <span>{t("vehicles.odometer")}: {v.odometerReading || 0} {t("vehicles.km")}</span>
                  {v.lastMaintenanceDate && (
                    <span>{t("vehicles.lastMaintenance")}: {new Date(v.lastMaintenanceDate).toLocaleDateString("ar-SA")}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(v)} data-testid={`button-edit-vehicle-${v.id}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(v.id)} data-testid={`button-delete-vehicle-${v.id}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function TripsSection() {
  useLang();
  const { toast } = useToast();
  const { data: allTrips, isLoading } = useQuery<Trip[]>({ queryKey: ["/api/trips"] });
  const { data: allVehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: allUsers } = useQuery<AuthUser[]>({ queryKey: ["/api/users"] });
  const [showAdd, setShowAdd] = useState(false);
  const [personName, setPersonName] = useState("");
  const [location, setLocation] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => { setPersonName(""); setLocation(""); setDepartureTime(""); setVehicleId(""); setNotes(""); };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/trips", data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trips"] }); setShowAdd(false); resetForm(); toast({ title: t("trips.tripAdded") }); },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/trips/${id}/status`, { status });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trips"] }); toast({ title: t("trips.tripUpdated") }); },
  });

  const handleSave = () => {
    createMutation.mutate({
      personName, location,
      departureTime: departureTime ? new Date(departureTime) : new Date(),
      vehicleId: vehicleId ? parseInt(vehicleId) : null,
      notes: notes || null,
    });
  };

  const getVehicleName = (vid: number | null) => {
    if (!vid) return "";
    return allVehicles?.find(v => v.id === vid)?.name || "";
  };

  const getUserName = (uid: string | null) => {
    if (!uid) return "";
    const u = allUsers?.find(usr => usr.id === uid);
    return u?.firstName || u?.username || "";
  };

  const formatWaiting = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} ${t("trips.minutes")} ${secs} ${t("trips.seconds")}`;
  };

  const tripStatusVariants: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    started: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    waiting: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-trip"><Plus className="w-4 h-4" /> {t("trips.addTrip")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("trips.addTrip")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("trips.personName")} value={personName} onChange={e => setPersonName(e.target.value)} data-testid="input-trip-person" />
            <Input placeholder={t("trips.location")} value={location} onChange={e => setLocation(e.target.value)} data-testid="input-trip-location" />
            <Input type="datetime-local" placeholder={t("trips.departureTime")} value={departureTime} onChange={e => setDepartureTime(e.target.value)} data-testid="input-trip-departure" />
            {allVehicles && allVehicles.length > 0 && (
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger data-testid="select-trip-vehicle"><SelectValue placeholder={t("trips.selectVehicle")} /></SelectTrigger>
                <SelectContent>{allVehicles.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Input placeholder={t("fields.notes")} value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-trip-notes" />
            <Button className="w-full" disabled={!personName || !location || createMutation.isPending} data-testid="button-save-trip" onClick={handleSave}>
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!allTrips?.length ? (
        <p className="text-center text-muted-foreground py-8">{t("trips.noTrips")}</p>
      ) : (
        allTrips.map(trip => (
          <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{trip.personName}</span>
                </div>
                <Badge className={`no-default-hover-elevate no-default-active-elevate ${tripStatusVariants[trip.status] || ""}`}>
                  {t(`status.${trip.status}`)}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{t("trips.location")}: {trip.location}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="w-3 h-3" />
                  <span>{t("trips.departureTime")}: {new Date(trip.departureTime).toLocaleString("ar-SA")}</span>
                </div>
                {trip.vehicleId && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Car className="w-3 h-3" />
                    <span>{t("trips.vehicle")}: {getVehicleName(trip.vehicleId)}</span>
                  </div>
                )}
                {trip.assignedDriver && <span>{t("roles.driver")}: {getUserName(trip.assignedDriver)}</span>}
                {trip.waitingDuration && trip.waitingDuration > 0 && (
                  <span>{t("driver.waitingTime")}: {formatWaiting(trip.waitingDuration)}</span>
                )}
                {trip.notes && <p>{t("fields.notes")}: {trip.notes}</p>}
              </div>
              {trip.status === "pending" && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: trip.id, status: "approved" })} disabled={statusMutation.isPending} data-testid={`button-approve-trip-${trip.id}`}>
                    <Check className="w-4 h-4 ml-1" /> {t("actions.approve")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: trip.id, status: "rejected" })} disabled={statusMutation.isPending} data-testid={`button-reject-trip-${trip.id}`}>
                    <X className="w-4 h-4 ml-1" /> {t("actions.reject")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function TechniciansSection() {
  useLang();
  const { toast } = useToast();
  const { data: technicians, isLoading } = useQuery<Technician[]>({ queryKey: ["/api/technicians"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => { setName(""); setSpecialty(""); setPhone(""); setNotes(""); setEditingTech(null); };

  const openEdit = (tech: Technician) => {
    setEditingTech(tech); setName(tech.name); setSpecialty(tech.specialty);
    setPhone(tech.phone); setNotes(tech.notes || ""); setShowAdd(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/technicians", data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/technicians"] }); setShowAdd(false); resetForm(); toast({ title: t("technicians.technicianAdded") }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/technicians/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/technicians"] }); setShowAdd(false); resetForm(); toast({ title: t("technicians.technicianUpdated") }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/technicians/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/technicians"] }); },
  });

  const handleSave = () => {
    const data = { name, specialty, phone, notes: notes || null };
    if (editingTech) updateMutation.mutate({ id: editingTech.id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-technician"><Plus className="w-4 h-4" /> {t("technicians.addTechnician")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTech ? t("technicians.editTechnician") : t("technicians.addTechnician")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("technicians.name")} value={name} onChange={e => setName(e.target.value)} data-testid="input-tech-name" />
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger data-testid="select-tech-specialty"><SelectValue placeholder={t("technicians.specialty")} /></SelectTrigger>
              <SelectContent>
                {specialties.map(s => <SelectItem key={s} value={s}>{t(`technicians.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder={t("technicians.phone")} value={phone} onChange={e => setPhone(e.target.value)} data-testid="input-tech-phone" dir="ltr" />
            <Input placeholder={t("fields.notes")} value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-tech-notes" />
            <Button className="w-full" disabled={!name || !specialty || !phone || createMutation.isPending || updateMutation.isPending} data-testid="button-save-technician" onClick={handleSave}>
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!technicians?.length ? (
        <div className="text-center py-8">
          <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("technicians.noTechnicians")}</p>
        </div>
      ) : (
        technicians.map(tech => (
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
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(tech)} data-testid={`button-edit-tech-${tech.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(tech.id)} data-testid={`button-delete-tech-${tech.id}`}>
                    <X className="w-4 h-4" />
                  </Button>
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
        ))
      )}
    </div>
  );
}

export default function AdminLogistics() {
  useLang();
  const [activeTab, setActiveTab] = useState("trips");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-logistics-title">
        <Car className="w-5 h-5 text-primary" />
        {t("nav.logisticsSection")}
      </h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start gap-1 flex-wrap">
          <TabsTrigger value="trips" className="gap-1" data-testid="tab-trips">
            <MapPin className="w-4 h-4" /> {t("nav.trips")}
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-1" data-testid="tab-vehicles">
            <Car className="w-4 h-4" /> {t("nav.vehicles")}
          </TabsTrigger>
          <TabsTrigger value="technicians" className="gap-1" data-testid="tab-technicians">
            <Wrench className="w-4 h-4" /> {t("nav.technicians")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="trips"><TripsSection /></TabsContent>
        <TabsContent value="vehicles"><VehiclesSection /></TabsContent>
        <TabsContent value="technicians"><TechniciansSection /></TabsContent>
      </Tabs>
    </div>
  );
}
