import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, MapPin, Clock, Wrench, Plus, Pencil, X, Check, Phone, Navigation, AlertTriangle, CheckCircle, Lock } from "lucide-react";
import { useState } from "react";
import type { Vehicle, Trip, Technician, TripLocation } from "@shared/schema";
import { t, getLang, displayName, formatDate, formatTime, formatDateTime } from "@/lib/i18n";
import { useLang } from "@/App";
import type { AuthUser } from "@/hooks/use-auth";

const specialties = ["plumber", "farmer", "acTech", "electrician", "carpenter", "painter", "other"] as const;

function VehiclesSection() {
  const { lang } = useLang();
  const { toast } = useToast();
  const { data: allVehicles, isLoading } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: allUsers } = useQuery<AuthUser[]>({ queryKey: ["/api/users"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [name, setName] = useState("");
  const [odometer, setOdometer] = useState("");
  const [lastMaintenance, setLastMaintenance] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState("");

  const householdUsers = allUsers?.filter(u => u.role === "household") || [];

  const resetForm = () => { setName(""); setOdometer(""); setLastMaintenance(""); setIsPrivate(false); setAssignedUserId(""); setEditingVehicle(null); };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v); setName(v.name); setOdometer(String(v.odometerReading || ""));
    setLastMaintenance(v.lastMaintenanceDate ? new Date(v.lastMaintenanceDate).toISOString().split("T")[0] : "");
    setIsPrivate(v.isPrivate || false); setAssignedUserId(v.assignedUserId || "");
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
    const data = { name, odometerReading: odometer ? parseInt(odometer) : 0, lastMaintenanceDate: lastMaintenance ? new Date(lastMaintenance) : null, isPrivate, assignedUserId: isPrivate && assignedUserId ? assignedUserId : null };
    if (editingVehicle) updateMutation.mutate({ id: editingVehicle.id, data });
    else createMutation.mutate(data);
  };

  const getUserName = (uid: string | null) => {
    if (!uid) return "";
    const u = allUsers?.find(usr => usr.id === uid);
    return u ? displayName(u) : "";
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-vehicle"><Plus className="w-4 h-4" /> {t("vehicles.addVehicle")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? t("vehicles.editVehicle") : t("vehicles.addVehicle")}</DialogTitle>
            <DialogDescription className="sr-only">{editingVehicle ? t("vehicles.editVehicle") : t("vehicles.addVehicle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("vehicles.name")} value={name} onChange={e => setName(e.target.value)} data-testid="input-vehicle-name" />
            <Input type="number" placeholder={t("vehicles.odometer")} value={odometer} onChange={e => setOdometer(e.target.value)} data-testid="input-vehicle-odometer" />
            <Input type="date" placeholder={t("vehicles.lastMaintenance")} value={lastMaintenance} onChange={e => setLastMaintenance(e.target.value)} data-testid="input-vehicle-maintenance" />
            <div className="flex items-center gap-2">
              <Checkbox id="vehicle-private" checked={isPrivate} onCheckedChange={(checked) => { setIsPrivate(!!checked); if (!checked) setAssignedUserId(""); }} data-testid="checkbox-vehicle-private" />
              <label htmlFor="vehicle-private" className="text-sm cursor-pointer">{t("vehicles.privateVehicle")}</label>
            </div>
            {isPrivate && householdUsers.length > 0 && (
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger data-testid="select-vehicle-user">
                  <SelectValue placeholder={t("vehicles.selectOwner")} />
                </SelectTrigger>
                <SelectContent>
                  {householdUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{displayName(u)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button className="w-full" disabled={!name || (isPrivate && !assignedUserId) || createMutation.isPending || updateMutation.isPending} data-testid="button-save-vehicle" onClick={handleSave}>
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
                  {v.isPrivate && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="w-3 h-3" />
                      {t("vehicles.private")}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex gap-3 flex-wrap">
                  <span>{t("vehicles.odometer")}: {v.odometerReading || 0} {t("vehicles.km")}</span>
                  {v.lastMaintenanceDate && (
                    <span>{t("vehicles.lastMaintenance")}: {formatDate(v.lastMaintenanceDate)}</span>
                  )}
                  {v.isPrivate && v.assignedUserId && (
                    <span>{t("vehicles.owner")}: {getUserName(v.assignedUserId)}</span>
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

function LocationsSection() {
  useLang();
  const lang = getLang();
  const { toast } = useToast();
  const { data: locations, isLoading } = useQuery<TripLocation[]>({ queryKey: ["/api/trip-locations"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingLoc, setEditingLoc] = useState<TripLocation | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [address, setAddress] = useState("");

  const resetForm = () => { setNameAr(""); setNameEn(""); setAddress(""); setEditingLoc(null); };

  const openEdit = (loc: TripLocation) => {
    setEditingLoc(loc);
    setNameAr(loc.nameAr);
    setNameEn(loc.nameEn || "");
    setAddress(loc.address || "");
    setShowAdd(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/trip-locations", data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trip-locations"] }); setShowAdd(false); resetForm(); toast({ title: t("locations.locationAdded") }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/trip-locations/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trip-locations"] }); setShowAdd(false); resetForm(); toast({ title: t("locations.locationUpdated") }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/trip-locations/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trip-locations"] }); toast({ title: t("locations.locationDeleted") }); },
  });

  const handleSave = () => {
    const data = { nameAr, nameEn: nameEn || null, address: address || null };
    if (editingLoc) updateMutation.mutate({ id: editingLoc.id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-location"><Plus className="w-4 h-4" /> {t("locations.addLocation")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLoc ? t("locations.editLocation") : t("locations.addLocation")}</DialogTitle>
            <DialogDescription className="sr-only">{editingLoc ? t("locations.editLocation") : t("locations.addLocation")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("locations.nameAr")} value={nameAr} onChange={e => setNameAr(e.target.value)} data-testid="input-location-name-ar" />
            <Input placeholder={t("locations.nameEn")} value={nameEn} onChange={e => setNameEn(e.target.value)} data-testid="input-location-name-en" dir="ltr" />
            <Input placeholder={t("locations.address")} value={address} onChange={e => setAddress(e.target.value)} data-testid="input-location-address" />
            <Button className="w-full" disabled={!nameAr || createMutation.isPending || updateMutation.isPending} data-testid="button-save-location" onClick={handleSave}>
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!locations?.length ? (
        <div className="text-center py-8">
          <Navigation className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("locations.noLocations")}</p>
        </div>
      ) : (
        locations.map(loc => (
          <Card key={loc.id} data-testid={`card-location-${loc.id}`}>
            <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{lang === "ar" ? loc.nameAr : (loc.nameEn || loc.nameAr)}</span>
                </div>
                {loc.nameEn && lang === "ar" && (
                  <p className="text-sm text-muted-foreground mt-0.5 mr-6">{loc.nameEn}</p>
                )}
                {loc.address && (
                  <p className="text-sm text-muted-foreground mt-0.5 mr-6">{loc.address}</p>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(loc)} data-testid={`button-edit-location-${loc.id}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(loc.id)} data-testid={`button-delete-location-${loc.id}`}>
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
  const lang = getLang();
  const { toast } = useToast();
  const { data: currentUser } = useQuery<AuthUser>({ queryKey: ["/api/auth/user"] });
  const canCreateTrip = currentUser?.role === "admin" || currentUser?.role === "household";
  const canApproveTrip = currentUser?.role === "admin" || currentUser?.canApproveTrips;
  const { data: allTrips, isLoading } = useQuery<Trip[]>({ queryKey: ["/api/trips"] });
  const { data: allVehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: allUsers } = useQuery<AuthUser[]>({ queryKey: ["/api/users"] });
  const { data: allLocations } = useQuery<TripLocation[]>({ queryKey: ["/api/trip-locations"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [personName, setPersonName] = useState("");
  const [location, setLocation] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTimeVal, setDepartureTimeVal] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("30");
  const [vehicleId, setVehicleId] = useState("");
  const [assignedDriver, setAssignedDriver] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => { setEditingTrip(null); setPersonName(""); setLocation(""); setDepartureDate(""); setDepartureTimeVal(""); setEstimatedDuration("30"); setVehicleId(""); setAssignedDriver(""); setNotes(""); };

  const openEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setPersonName(trip.personName || "");
    setLocation(trip.location || "");
    const dt = new Date(trip.departureTime);
    setDepartureDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`);
    setDepartureTimeVal(`${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`);
    setEstimatedDuration(String(trip.estimatedDuration || 30));
    setVehicleId(trip.vehicleId ? String(trip.vehicleId) : "");
    setAssignedDriver(trip.assignedDriver || "");
    setNotes(trip.notes || "");
    setShowAdd(true);
  };
  const departureTime = departureDate && departureTimeVal ? `${departureDate}T${departureTimeVal}` : "";

  const drivers = allUsers?.filter(u => u.role === "driver") || [];

  type DriverAvailability = { busy: boolean; activeTrips: { id: number; personName: string; location: string; status: string; isPersonal?: boolean }[]; activeOrders: { id: number; status: string }[]; timeConflicts?: { id: number; personName: string; location: string; departureTime: string; estimatedDuration: number; isPersonal?: boolean }[] };
  const editingTripId = editingTrip?.id ?? null;
  const { data: driverAvailability } = useQuery<DriverAvailability>({
    queryKey: ["/api/drivers", assignedDriver, "availability", departureTime, estimatedDuration, editingTripId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departureTime) params.set("departureTime", new Date(departureTime).toISOString());
      if (estimatedDuration) params.set("duration", estimatedDuration);
      if (editingTripId) params.set("excludeTripId", String(editingTripId));
      const res = await fetch(`/api/drivers/${assignedDriver}/availability?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to check");
      return res.json();
    },
    enabled: !!assignedDriver,
  });

  const availableVehicles = allVehicles?.filter(v => !v.isPrivate || v.assignedUserId === currentUser?.id || currentUser?.role === "driver" || currentUser?.role === "admin") || [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/trips", data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trips"] }); setShowAdd(false); resetForm(); toast({ title: t("trips.tripAdded") }); },
    onError: (error: Error) => { toast({ title: error.message || t("trips.saveFailed"), variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("PATCH", `/api/trips/${editingTrip!.id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trips"] }); setShowAdd(false); resetForm(); toast({ title: t("trips.tripUpdated") }); },
    onError: () => { toast({ title: t("trips.saveFailed"), variant: "destructive" }); },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/trips/${id}/status`, { status });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trips"] }); toast({ title: t("trips.tripUpdated") }); },
  });

  const handleSave = () => {
    if (!departureTime) {
      toast({ title: t("trips.departureRequired"), variant: "destructive" });
      return;
    }
    const data = {
      personName, location,
      departureTime: new Date(departureTime).toISOString(),
      estimatedDuration: parseInt(estimatedDuration),
      vehicleId: vehicleId ? parseInt(vehicleId) : null,
      assignedDriver: assignedDriver || null,
      notes: notes || null,
    };
    if (editingTrip) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleLocationSelect = (val: string) => {
    if (val === "__custom__") {
      setLocation("");
    } else {
      const loc = allLocations?.find(l => String(l.id) === val);
      if (loc) {
        setLocation(lang === "ar" ? loc.nameAr : (loc.nameEn || loc.nameAr));
      }
    }
  };

  const getVehicleName = (vid: number | null) => {
    if (!vid) return "";
    return allVehicles?.find(v => v.id === vid)?.name || "";
  };

  const getUserName = (uid: string | null) => {
    if (!uid) return "";
    const u = allUsers?.find(usr => usr.id === uid);
    return u ? displayName(u) : "";
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
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      {canCreateTrip && <Button className="gap-2" data-testid="button-add-trip" onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="w-4 h-4" /> {t("trips.addTrip")}</Button>}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTrip ? t("trips.editTrip") : t("trips.addTrip")}</DialogTitle>
            <DialogDescription className="sr-only">{editingTrip ? t("trips.editTrip") : t("trips.addTrip")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("trips.personName")} value={personName} onChange={e => setPersonName(e.target.value)} data-testid="input-trip-person" />

            {allLocations && allLocations.length > 0 ? (
              <div className="space-y-2">
                <Select onValueChange={handleLocationSelect}>
                  <SelectTrigger data-testid="select-trip-location">
                    <SelectValue placeholder={t("trips.selectLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    {allLocations.map(loc => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {lang === "ar" ? loc.nameAr : (loc.nameEn || loc.nameAr)}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">{t("trips.location")} ...</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder={t("trips.location")} value={location} onChange={e => setLocation(e.target.value)} data-testid="input-trip-location" />
              </div>
            ) : (
              <Input placeholder={t("trips.location")} value={location} onChange={e => setLocation(e.target.value)} data-testid="input-trip-location" />
            )}

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("trips.departureTime")} *</label>
              <div className="flex gap-2">
                <Input type="date" value={departureDate} min={new Date().toISOString().split("T")[0]} onChange={e => setDepartureDate(e.target.value)} data-testid="input-trip-departure-date" className="flex-1" />
                <Input type="time" value={departureTimeVal} onChange={e => setDepartureTimeVal(e.target.value)} data-testid="input-trip-departure-time" className="flex-1" />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("trips.estimatedDuration")}</label>
              <Select value={estimatedDuration} onValueChange={setEstimatedDuration}>
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

            {drivers.length > 0 && (
              <Select value={assignedDriver} onValueChange={setAssignedDriver}>
                <SelectTrigger data-testid="select-trip-driver">
                  <SelectValue placeholder={t("trips.selectDriver")} />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {displayName(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {assignedDriver && driverAvailability?.busy && (
              <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" data-testid="alert-driver-conflict">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{t("conflict.driverBusy")}</span>
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 mr-6">
                  {driverAvailability.activeTrips.map(tr => (
                    <div key={tr.id}>{t("conflict.tripTo")} {tr.location} ({t(`status.${tr.status}`)}) {tr.isPersonal ? `- ${t("trips.personal")}` : ""}</div>
                  ))}
                  {driverAvailability.activeOrders.map(o => (
                    <div key={o.id}>{t("conflict.orderNum")}{o.id} ({t("conflict.activeShopping")})</div>
                  ))}
                  {driverAvailability.timeConflicts?.map(tc => {
                    const startTime = formatTime(tc.departureTime);
                    const endTime = formatTime(new Date(new Date(tc.departureTime).getTime() + (tc.estimatedDuration || 30) * 60000));
                    const label = tc.isPersonal ? `${t("conflict.tripLabel")} "${tc.personName}" ${t("trips.personal")}` : `${t("conflict.tripLabel")} ${tc.personName} ${t("conflict.toLocation")} ${tc.location}`;
                    return <div key={tc.id}>{t("conflict.timeConflict")}: {label} - {startTime} {t("conflict.toLocation")} {endTime}</div>;
                  })}
                </div>
              </div>
            )}

            {assignedDriver && driverAvailability && !driverAvailability.busy && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400" data-testid="text-driver-available">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{t("conflict.driverAvailable")}</span>
              </div>
            )}

            {availableVehicles.length > 0 && (
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger data-testid="select-trip-vehicle"><SelectValue placeholder={t("trips.selectVehicle")} /></SelectTrigger>
                <SelectContent>{availableVehicles.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}{v.isPrivate ? ` (${t("vehicles.private")})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            )}

            <Input placeholder={t("fields.notes")} value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-trip-notes" />
            <Button className="w-full" disabled={!personName || !location || !departureDate || !departureTimeVal || createMutation.isPending || updateMutation.isPending} data-testid="button-save-trip" onClick={handleSave}>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{trip.personName}</span>
                  {trip.isPersonal && (
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                      {t("trips.personal")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${tripStatusVariants[trip.status] || ""}`}>
                    {t(`status.${trip.status}`)}
                  </Badge>
                  {(trip.createdBy === currentUser?.id || currentUser?.role === "admin") && ["pending", "approved"].includes(trip.status) && (!trip.departureTime || new Date(trip.departureTime) > new Date()) && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { if (confirm(t("messages.confirmDelete"))) statusMutation.mutate({ id: trip.id, status: "cancelled" }); }} data-testid={`button-cancel-trip-${trip.id}`}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {!trip.isPersonal && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{t("trips.location")}: {trip.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="w-3 h-3" />
                  {trip.isPersonal && trip.departureTime && trip.estimatedDuration ? (
                    <span className="text-foreground/80 font-medium">{formatTime(trip.departureTime)} - {formatTime(new Date(new Date(trip.departureTime).getTime() + trip.estimatedDuration * 60000))} ({trip.estimatedDuration} {t("trips.minutes")})</span>
                  ) : (
                    <span className="text-foreground/80 font-medium">{t("trips.departureTime")}: {formatDateTime(trip.departureTime)}</span>
                  )}
                </div>
                {!trip.isPersonal && trip.estimatedDuration && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Clock className="w-3 h-3" />
                    <span>{t("trips.estimatedDuration")}: {trip.estimatedDuration} {t("trips.minutes")}</span>
                  </div>
                )}
                {trip.vehicleId && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Car className="w-3 h-3" />
                    <span>{t("trips.vehicle")}: {getVehicleName(trip.vehicleId)}</span>
                  </div>
                )}
                {!trip.isPersonal && trip.assignedDriver && <span>{t("roles.driver")}: {getUserName(trip.assignedDriver)}</span>}
                {!trip.isPersonal && trip.waitingDuration && trip.waitingDuration > 0 && (
                  <span>{t("driver.waitingTime")}: {formatWaiting(trip.waitingDuration)}</span>
                )}
                {trip.notes && <p>{t("fields.notes")}: {trip.notes}</p>}
              </div>
              {trip.status === "pending" && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(trip.createdBy === currentUser?.id || currentUser?.role === "admin") && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEditTrip(trip)} data-testid={`button-edit-trip-${trip.id}`}>
                      <Pencil className="w-4 h-4" /> {t("trips.editTrip")}
                    </Button>
                  )}
                  {canApproveTrip && (
                    <>
                      <Button size="sm" onClick={() => statusMutation.mutate({ id: trip.id, status: "approved" })} disabled={statusMutation.isPending} data-testid={`button-approve-trip-${trip.id}`}>
                        <Check className="w-4 h-4 ml-1" /> {t("actions.approve")}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: trip.id, status: "rejected" })} disabled={statusMutation.isPending} data-testid={`button-reject-trip-${trip.id}`}>
                        <X className="w-4 h-4 ml-1" /> {t("actions.reject")}
                      </Button>
                    </>
                  )}
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
          <DialogHeader>
            <DialogTitle>{editingTech ? t("technicians.editTechnician") : t("technicians.addTechnician")}</DialogTitle>
            <DialogDescription className="sr-only">{editingTech ? t("technicians.editTechnician") : t("technicians.addTechnician")}</DialogDescription>
          </DialogHeader>
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
        <TabsList className="w-full justify-start gap-1 flex-nowrap overflow-x-auto">
          <TabsTrigger value="trips" className="gap-1 shrink-0" data-testid="tab-trips">
            <MapPin className="w-4 h-4" /> {t("nav.trips")}
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1 shrink-0" data-testid="tab-locations">
            <Navigation className="w-4 h-4" /> {t("nav.locations")}
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-1 shrink-0" data-testid="tab-vehicles">
            <Car className="w-4 h-4" /> {t("nav.vehicles")}
          </TabsTrigger>
          <TabsTrigger value="technicians" className="gap-1 shrink-0" data-testid="tab-technicians">
            <Wrench className="w-4 h-4" /> {t("nav.technicians")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="trips"><TripsSection /></TabsContent>
        <TabsContent value="locations"><LocationsSection /></TabsContent>
        <TabsContent value="vehicles"><VehiclesSection /></TabsContent>
        <TabsContent value="technicians"><TechniciansSection /></TabsContent>
      </Tabs>
    </div>
  );
}
