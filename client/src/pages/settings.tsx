import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { LogOut, Moon, Sun, Plus, DoorOpen, X, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { t, getLang } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import AdminUsers from "@/pages/admin-users";
import type { Room } from "@shared/schema";

function ThemeToggleCard() {
  const { lang } = useLang();
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={toggle} data-testid="card-theme-toggle">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {dark ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
          </div>
          <span className="text-sm font-medium">{dark ? (lang === "ar" ? "الوضع الداكن" : "Dark Mode") : (lang === "ar" ? "الوضع الفاتح" : "Light Mode")}</span>
        </div>
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
          {dark ? (lang === "ar" ? "مفعّل" : "On") : (lang === "ar" ? "معطّل" : "Off")}
        </Badge>
      </CardContent>
    </Card>
  );
}

function LangToggleCard() {
  const { lang, toggleLang } = useLang();

  return (
    <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={toggleLang} data-testid="card-lang-toggle">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-muted-foreground">{lang === "ar" ? "EN" : "ع"}</span>
          </div>
          <span className="text-sm font-medium">{lang === "ar" ? "اللغة" : "Language"}</span>
        </div>
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
          {lang === "ar" ? "العربية" : "English"}
        </Badge>
      </CardContent>
    </Card>
  );
}

function RoomManagement() {
  const { lang } = useLang();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");

  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });

  const createRoom = useMutation({
    mutationFn: (data: { nameAr: string; nameEn: string }) =>
      apiRequest("POST", "/api/rooms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: t("rooms.roomAdded") });
      setShowAdd(false);
      setNameAr("");
      setNameEn("");
    },
  });

  const toggleExclude = useMutation({
    mutationFn: ({ id, isExcluded }: { id: number; isExcluded: boolean }) =>
      apiRequest("PATCH", `/api/rooms/${id}`, { isExcluded }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: t("rooms.roomUpdated") });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: t("rooms.roomDeleted") });
    },
  });

  const reorderRooms = useMutation({
    mutationFn: (orderedIds: number[]) => apiRequest("POST", "/api/rooms/reorder", { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    },
  });

  const moveRoom = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rooms.length) return;
    const newOrder = [...rooms];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, moved);
    reorderRooms.mutate(newOrder.map(r => r.id));
  };

  return (
    <div className="space-y-3" data-testid="section-rooms">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <DoorOpen className="w-4 h-4" />
          {t("rooms.title")}
        </h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} data-testid="button-add-room">
          <Plus className="w-4 h-4" />
          {t("rooms.addRoom")}
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder={t("rooms.nameAr")}
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              data-testid="input-room-name-ar"
            />
            <Input
              placeholder={t("rooms.nameEn")}
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              data-testid="input-room-name-en"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createRoom.mutate({ nameAr, nameEn })}
                disabled={!nameAr || createRoom.isPending}
                data-testid="button-save-room"
              >
                {t("actions.save")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
                {t("actions.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t("rooms.noRooms")}</p>
      ) : (
        <div className="space-y-1.5">
          {rooms.map((room, index) => (
            <Card key={room.id} data-testid={`card-room-${room.id}`}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <DoorOpen className={`w-4 h-4 flex-shrink-0 ${room.isExcluded ? "text-muted-foreground/40" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium truncate ${room.isExcluded ? "text-muted-foreground/50" : ""}`}>
                    {lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={!room.isExcluded}
                    onCheckedChange={(checked) => toggleExclude.mutate({ id: room.id, isExcluded: !checked })}
                    data-testid={`switch-room-${room.id}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteRoom.mutate(room.id)}
                    data-testid={`button-delete-room-${room.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="flex flex-col -my-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={index === 0 || reorderRooms.isPending}
                      onClick={() => moveRoom(index, "up")}
                      data-testid={`button-room-up-${room.id}`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={index === rooms.length - 1 || reorderRooms.isPending}
                      onClick={() => moveRoom(index, "down")}
                      data-testid={`button-room-down-${room.id}`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  useLang();
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card data-testid="card-profile">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="text-lg font-bold">{(user.firstName?.[0] || user.username?.[0] || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold truncate" data-testid="text-profile-name">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs" data-testid="badge-profile-role">
                  {t(`roles.${user.role}`)}
                </Badge>
                {user.canApprove && (
                  <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs">
                    {t("admin.approvePermission")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <ThemeToggleCard />
        <LangToggleCard />
      </div>

      <Button variant="destructive" className="w-full gap-2" onClick={logout} data-testid="button-logout">
        <LogOut className="w-4 h-4" />
        {t("actions.logout")}
      </Button>

      {user.role === "admin" && (
        <>
          <div className="mt-6">
            <RoomManagement />
          </div>
          <div className="mt-6">
            <AdminUsers />
          </div>
        </>
      )}
    </div>
  );
}
