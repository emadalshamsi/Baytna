import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Phone, Plus, Pencil, X, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import type { Technician } from "@shared/schema";
import { t } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";

const specialties = ["plumber", "farmer", "acTech", "electrician", "carpenter", "painter", "other"] as const;

export default function TechniciansPage() {
  useLang();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: technicians, isLoading } = useQuery<Technician[]>({ queryKey: ["/api/technicians"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [showCoordinate, setShowCoordinate] = useState(false);
  const [coordinateTech, setCoordinateTech] = useState<Technician | null>(null);
  const [coordLocation, setCoordLocation] = useState("");
  const [coordTime, setCoordTime] = useState("");

  const resetForm = () => { setName(""); setSpecialty(""); setPhone(""); setNotes(""); setEditingTech(null); };

  const openEdit = (tech: Technician) => {
    setEditingTech(tech);
    setName(tech.name);
    setSpecialty(tech.specialty);
    setPhone(tech.phone);
    setNotes(tech.notes || "");
    setShowAdd(true);
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

  const coordinateMutation = useMutation({
    mutationFn: async ({ techId, location, departureTime }: { techId: number; location: string; departureTime: string }) => {
      await apiRequest("POST", `/api/technicians/${techId}/coordinate`, { location, departureTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setShowCoordinate(false);
      setCoordinateTech(null);
      setCoordLocation("");
      setCoordTime("");
      toast({ title: t("trips.coordinationCreated") });
    },
  });

  const handleSave = () => {
    const data = { name, specialty, phone, notes: notes || null };
    if (editingTech) updateMutation.mutate({ id: editingTech.id, data });
    else createMutation.mutate(data);
  };

  const openCoordinate = (tech: Technician) => {
    setCoordinateTech(tech);
    setCoordLocation("");
    setShowCoordinate(true);
  };

  if (isLoading) return <div className="space-y-3 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold flex items-center gap-2" data-testid="text-technicians-title">
          <Wrench className="w-5 h-5 text-primary" /> {t("technicians.title")}
        </h2>
        {isAdmin && (
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
                    {specialties.map(s => (
                      <SelectItem key={s} value={s}>{t(`technicians.${s}`)}</SelectItem>
                    ))}
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
        )}
      </div>

      <Dialog open={showCoordinate} onOpenChange={(open) => { setShowCoordinate(open); if (!open) { setCoordinateTech(null); setCoordLocation(""); setCoordTime(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("trips.coordinateWith")}: {coordinateTech?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("trips.location")} value={coordLocation} onChange={e => setCoordLocation(e.target.value)} data-testid="input-coord-location" />
            <Input type="datetime-local" placeholder={t("trips.departureTime")} value={coordTime} onChange={e => setCoordTime(e.target.value)} data-testid="input-coord-time" />
            <Button className="w-full" disabled={!coordLocation || coordinateMutation.isPending} data-testid="button-save-coordination" onClick={() => {
              if (coordinateTech) coordinateMutation.mutate({ techId: coordinateTech.id, location: coordLocation, departureTime: coordTime });
            }}>
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!technicians?.length ? (
        <div className="text-center py-12">
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
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(tech)} data-testid={`button-edit-tech-${tech.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(tech.id)} data-testid={`button-delete-tech-${tech.id}`}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {tech.notes && <p className="text-sm text-muted-foreground mb-2">{tech.notes}</p>}
              <div className="flex gap-2 flex-wrap">
                <a href={`tel:${tech.phone}`} data-testid={`link-call-tech-${tech.id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Phone className="w-4 h-4" /> {t("technicians.call")} {tech.phone}
                  </Button>
                </a>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openCoordinate(tech)} data-testid={`button-coordinate-tech-${tech.id}`}>
                  <MapPin className="w-4 h-4" /> {t("technicians.coordinate")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
