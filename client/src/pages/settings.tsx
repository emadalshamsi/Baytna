import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { LogOut, Plus, DoorOpen, X, ArrowUp, ArrowDown, ChevronDown, ChevronLeft, ChevronRight, Users, Camera, Lock, Bell, Eye, EyeOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { t, getLang } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import AdminUsers from "@/pages/admin-users";
import type { Room } from "@shared/schema";

function CollapsibleSection({ title, icon, defaultOpen = false, children, testId }: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  testId: string;
}) {
  const { lang } = useLang();
  const [open, setOpen] = useState(defaultOpen);
  const ChevronClosed = lang === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div data-testid={testId}>
      <button
        type="button"
        className="flex items-center gap-2 w-full text-start py-2 px-1"
        onClick={() => setOpen(!open)}
        data-testid={`button-toggle-${testId}`}
      >
        {open ? <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronClosed className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
        {icon}
        <span className="text-base font-bold flex-1">{title}</span>
      </button>
      {open && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
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
    <div className="space-y-3">
      <div className="flex items-center justify-end">
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

function ProfilePhotoSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { profileImageUrl?: string }) =>
      apiRequest("PATCH", "/api/auth/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("profile.profileUpdated") });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (data.imageUrl) {
        updateProfileMutation.mutate({ profileImageUrl: data.imageUrl });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = () => {
    updateProfileMutation.mutate({ profileImageUrl: "" });
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="w-20 h-20">
          {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={user.firstName || user.username} />}
          <AvatarFallback className="text-2xl font-bold">{(user.firstName?.[0] || user.username?.[0] || "U").toUpperCase()}</AvatarFallback>
        </Avatar>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} data-testid="input-profile-photo" />
        <Button
          size="icon"
          variant="secondary"
          className="absolute -bottom-1 -left-1 rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-change-photo"
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>
      {user.profileImageUrl && (
        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={removePhoto} data-testid="button-remove-photo">
          {t("profile.removePhoto")}
        </Button>
      )}
    </div>
  );
}

function ChangePasswordSection() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword }),
    onSuccess: () => {
      toast({ title: t("profile.passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => {
      toast({ title: t("profile.wrongPassword"), variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (newPassword.length < 6) {
      toast({ title: t("profile.passwordTooShort"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("profile.passwordMismatch"), variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          type={showCurrent ? "text" : "password"}
          placeholder={t("profile.currentPassword")}
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          data-testid="input-current-password"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute top-0 left-0 h-full"
          onClick={() => setShowCurrent(!showCurrent)}
          data-testid="button-toggle-current-password"
        >
          {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
      <div className="relative">
        <Input
          type={showNew ? "text" : "password"}
          placeholder={t("profile.newPassword")}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          data-testid="input-new-password"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute top-0 left-0 h-full"
          onClick={() => setShowNew(!showNew)}
          data-testid="button-toggle-new-password"
        >
          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
      <Input
        type="password"
        placeholder={t("profile.confirmPassword")}
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        data-testid="input-confirm-password"
      />
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
        data-testid="button-change-password"
      >
        {t("profile.changePassword")}
      </Button>
    </div>
  );
}

function NotificationToggle() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setEnabled(Notification.permission === "granted");
    }
  }, []);

  const toggleNotifications = async (checked: boolean) => {
    setLoading(true);
    try {
      if (checked) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const reg = await navigator.serviceWorker.ready;
          const vapidRes = await fetch("/api/vapid-public-key", { credentials: "include" });
          const { publicKey } = await vapidRes.json();
          if (publicKey) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: publicKey,
            });
            const subJson = sub.toJSON();
            await fetch("/api/push-subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                endpoint: subJson.endpoint,
                keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
              }),
            });
          }
          setEnabled(true);
          toast({ title: t("profile.notificationsEnabled") });
        }
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push-unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setEnabled(false);
        toast({ title: t("profile.notificationsDisabled") });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">{t("profile.enableNotifications")}</span>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={toggleNotifications}
        disabled={loading}
        data-testid="switch-notifications"
      />
    </div>
  );
}

export default function SettingsPage() {
  useLang();
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-4">
      <Card data-testid="card-profile">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <ProfilePhotoSection />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold truncate" data-testid="text-profile-name">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </h2>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-profile-username">@{user.username}</p>
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

      <Card>
        <CardContent className="p-4 space-y-1">
          <NotificationToggle />
        </CardContent>
      </Card>

      <CollapsibleSection
        title={t("profile.changePassword")}
        icon={<Lock className="w-5 h-5" />}
        testId="section-change-password"
      >
        <Card>
          <CardContent className="p-4">
            <ChangePasswordSection />
          </CardContent>
        </Card>
      </CollapsibleSection>

      {user.role === "admin" && (
        <div className="space-y-2">
          <CollapsibleSection
            title={t("rooms.title")}
            icon={<DoorOpen className="w-5 h-5" />}
            testId="section-rooms"
          >
            <RoomManagement />
          </CollapsibleSection>

          <CollapsibleSection
            title={t("nav.users")}
            icon={<Users className="w-5 h-5" />}
            testId="section-users"
          >
            <AdminUsers />
          </CollapsibleSection>
        </div>
      )}

      <Button variant="destructive" className="w-full gap-2" onClick={logout} data-testid="button-logout">
        <LogOut className="w-4 h-4" />
        {t("actions.logout")}
      </Button>
    </div>
  );
}
