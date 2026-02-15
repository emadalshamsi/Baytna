import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { LogOut, Plus, X, ChevronDown, ChevronLeft, ChevronRight, Users, Camera, Lock, Bell, Eye, EyeOff, ZoomIn, ZoomOut, RotateCw, GripVertical, Pencil } from "lucide-react";
import { ROOM_ICON_OPTIONS, getRoomIcon } from "@/lib/room-icons";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { t, getLang, displayName } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import AdminUsers from "@/pages/admin-users";
import type { Room } from "@shared/schema";

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/jpeg", 0.9);
  });
}

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

function IconPicker({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5" data-testid="icon-picker">
      {ROOM_ICON_OPTIONS.map(({ key, Icon }) => (
        <button
          key={key}
          type="button"
          className={`flex flex-col items-center gap-1 p-2 rounded-md transition-colors ${
            selected === key ? "bg-primary text-primary-foreground" : "hover-elevate text-muted-foreground"
          }`}
          onClick={() => onSelect(key)}
          data-testid={`icon-option-${key}`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[9px] leading-tight text-center">{t(`rooms.icon_${key}`)}</span>
        </button>
      ))}
    </div>
  );
}

function RoomManagement() {
  const { lang } = useLang();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("door");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localRooms, setLocalRooms] = useState<Room[]>([]);

  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });

  useEffect(() => {
    setLocalRooms(rooms);
  }, [rooms]);

  const createRoom = useMutation({
    mutationFn: (data: { nameAr: string; nameEn: string; icon: string }) =>
      apiRequest("POST", "/api/rooms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: t("rooms.roomAdded") });
      resetForm();
    },
  });

  const updateRoom = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/rooms/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: t("rooms.roomUpdated") });
      resetForm();
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

  function resetForm() {
    setShowAdd(false);
    setEditingId(null);
    setNameAr("");
    setNameEn("");
    setSelectedIcon("door");
  }

  function startEdit(room: Room) {
    setEditingId(room.id);
    setShowAdd(true);
    setNameAr(room.nameAr);
    setNameEn(room.nameEn || "");
    setSelectedIcon(room.icon || "door");
  }

  function submitForm() {
    const data = { nameAr, nameEn, icon: selectedIcon };
    if (editingId) {
      updateRoom.mutate({ id: editingId, data });
    } else {
      createRoom.mutate(data);
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex === null || draggedIndex === index) return;
    const newOrder = [...localRooms];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, moved);
    setLocalRooms(newOrder);
    setDraggedIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    reorderRooms.mutate(localRooms.map(r => r.id));
    setDraggedIndex(null);
  };

  const handleTouchStart = useRef<{ index: number; startY: number } | null>(null);

  const onTouchStart = (index: number, e: React.TouchEvent) => {
    handleTouchStart.current = { index, startY: e.touches[0].clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!handleTouchStart.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - handleTouchStart.current.startY;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      const { index } = handleTouchStart.current;
      const direction = diff > 0 ? 1 : -1;
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < localRooms.length) {
        const newOrder = [...localRooms];
        const [moved] = newOrder.splice(index, 1);
        newOrder.splice(newIndex, 0, moved);
        setLocalRooms(newOrder);
        handleTouchStart.current = { index: newIndex, startY: currentY };
      }
    }
  };

  const onTouchEnd = () => {
    if (handleTouchStart.current) {
      reorderRooms.mutate(localRooms.map(r => r.id));
      handleTouchStart.current = null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => { if (showAdd && !editingId) { resetForm(); } else { resetForm(); setShowAdd(true); } }} data-testid="button-add-room">
          <Plus className="w-4 h-4" />
          {t("rooms.addRoom")}
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-3 space-y-3">
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
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("rooms.chooseIcon")}</p>
              <IconPicker selected={selectedIcon} onSelect={setSelectedIcon} />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={submitForm}
                disabled={!nameAr || createRoom.isPending || updateRoom.isPending}
                data-testid="button-save-room"
              >
                {editingId ? t("actions.update") : t("actions.save")}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>
                {t("actions.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {localRooms.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t("rooms.noRooms")}</p>
      ) : (
        <div className="space-y-1.5">
          {localRooms.map((room, index) => {
            const RoomIconComp = getRoomIcon(room.icon);
            return (
              <Card
                key={room.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                className={`transition-all ${draggedIndex === index ? "ring-2 ring-primary" : ""}`}
                data-testid={`card-room-${room.id}`}
              >
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing"
                    onTouchStart={(e) => onTouchStart(index, e)}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    <GripVertical className="w-4 h-4 flex-shrink-0 text-muted-foreground/50" />
                    <RoomIconComp className={`w-4 h-4 flex-shrink-0 ${room.isExcluded ? "text-muted-foreground/40" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium truncate ${room.isExcluded ? "text-muted-foreground/50" : ""}`}>
                      {lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Switch
                      checked={!room.isExcluded}
                      onCheckedChange={(checked) => toggleExclude.mutate({ id: room.id, isExcluded: !checked })}
                      data-testid={`switch-room-${room.id}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(room)}
                      data-testid={`button-edit-room-${room.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteRoom.mutate(room.id)}
                      data-testid={`button-delete-room-${room.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { profileImageUrl?: string }) =>
      apiRequest("PATCH", "/api/auth/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("profile.profileUpdated") });
    },
  });

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const croppedBlob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const { compressImage } = await import("@/lib/image-compress");
      const croppedFile = new File([croppedBlob], "profile.webp", { type: croppedBlob.type });
      const compressed = await compressImage(croppedFile);
      const formData = new FormData();
      formData.append("image", compressed, "profile.webp");
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (data.imageUrl) {
        updateProfileMutation.mutate({ profileImageUrl: data.imageUrl });
      }
      setCropDialogOpen(false);
      setImageSrc(null);
    } catch {
      toast({ title: t("profile.uploadFailed"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setImageSrc(null);
  };

  const removePhoto = () => {
    updateProfileMutation.mutate({ profileImageUrl: "" });
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="w-20 h-20">
          {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={displayName(user)} />}
          <AvatarFallback className="text-2xl font-bold">{displayName(user)[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} data-testid="input-profile-photo" />
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

      <Dialog open={cropDialogOpen} onOpenChange={(open) => { if (!open) handleCropCancel(); }}>
        <DialogContent className="max-w-sm p-0 overflow-visible" data-testid="dialog-crop-photo">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{t("profile.cropPhoto")}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-square bg-black">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="px-4 pb-2">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={(v) => setZoom(v[0])}
                data-testid="slider-zoom"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
          <DialogFooter className="p-4 pt-0 gap-2">
            <Button variant="outline" onClick={handleCropCancel} data-testid="button-crop-cancel">
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleCropConfirm} disabled={uploading} data-testid="button-crop-confirm">
              {uploading ? t("profile.uploading") : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setEnabled(Notification.permission === "granted" && !!sub);
        });
      });
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
                {displayName(user)}
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
