import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Ban, UserCheck, DoorOpen, ChevronDown, ChevronUp, Plus, UserPlus, Trash2, Pencil, Check, X } from "lucide-react";
import { useState } from "react";
import { t, displayName } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import type { AuthUser } from "@/hooks/use-auth";
import type { Room } from "@shared/schema";

function UserRoomAssignment({ userId, lang }: { userId: string; lang: string }) {
  const { toast } = useToast();
  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const { data: assignedRoomIds = [] } = useQuery<number[]>({
    queryKey: ["/api/user-rooms", userId],
  });

  const updateRoomsMutation = useMutation({
    mutationFn: async (roomIds: number[]) => {
      await apiRequest("PUT", `/api/user-rooms/${userId}`, { roomIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-rooms", userId] });
      toast({ title: t("rooms.roomsUpdated") });
    },
  });

  const activeRooms = rooms.filter(r => !r.isExcluded && r.isActive);

  const toggleRoom = (roomId: number) => {
    const newIds = assignedRoomIds.includes(roomId)
      ? assignedRoomIds.filter(id => id !== roomId)
      : [...assignedRoomIds, roomId];
    updateRoomsMutation.mutate(newIds);
  };

  if (activeRooms.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t" data-testid={`section-rooms-${userId}`}>
      <div className="flex items-center gap-2 mb-2">
        <DoorOpen className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-bold text-muted-foreground">{t("rooms.assignRooms")}</span>
        {assignedRoomIds.length === 0 && (
          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
            {t("rooms.allRooms")}
          </Badge>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {activeRooms.map(room => {
          const isAssigned = assignedRoomIds.includes(room.id);
          return (
            <Button
              key={room.id}
              size="sm"
              variant="outline"
              className={isAssigned ? "bg-purple-600 text-white border-purple-600 dark:bg-purple-500 dark:border-purple-500" : ""}
              onClick={() => toggleRoom(room.id)}
              disabled={updateRoomsMutation.isPending}
              data-testid={`button-toggle-room-${room.id}-${userId}`}
            >
              {lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function EditUserForm({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const { toast } = useToast();
  const [editUsername, setEditUsername] = useState(user.username || "");
  const [editFirstName, setEditFirstName] = useState(user.firstName || "");
  const [editFirstNameEn, setEditFirstNameEn] = useState(user.firstNameEn || "");

  const updateDetailsMutation = useMutation({
    mutationFn: async (data: { username: string; firstName: string; firstNameEn: string }) => {
      await apiRequest("PATCH", `/api/users/${user.id}/details`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("admin.userUpdated") });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err?.message || t("admin.usernameExists"), variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!editUsername.trim()) return;
    updateDetailsMutation.mutate({
      username: editUsername.trim(),
      firstName: editFirstName.trim(),
      firstNameEn: editFirstNameEn.trim(),
    });
  };

  return (
    <div className="mt-3 pt-3 border-t space-y-2" data-testid={`section-edit-user-${user.id}`}>
      <div className="flex items-center gap-2 mb-2">
        <Pencil className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-bold text-muted-foreground">{t("admin.editUser")}</span>
      </div>
      <Input
        placeholder={t("auth.username")}
        value={editUsername}
        onChange={e => setEditUsername(e.target.value)}
        data-testid={`input-edit-username-${user.id}`}
      />
      <Input
        placeholder={t("auth.firstName")}
        value={editFirstName}
        onChange={e => setEditFirstName(e.target.value)}
        data-testid={`input-edit-firstname-${user.id}`}
      />
      <Input
        placeholder={t("auth.nameEn")}
        value={editFirstNameEn}
        onChange={e => setEditFirstNameEn(e.target.value)}
        data-testid={`input-edit-nameen-${user.id}`}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          onClick={handleSave}
          disabled={updateDetailsMutation.isPending || !editUsername.trim()}
          data-testid={`button-save-edit-${user.id}`}
        >
          <Check className="w-4 h-4" />
          {t("actions.save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={onClose}
          data-testid={`button-cancel-edit-${user.id}`}
        >
          <X className="w-4 h-4" />
          {t("admin.cancel")}
        </Button>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { lang } = useLang();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: allUsers, isLoading } = useQuery<AuthUser[]>({ queryKey: ["/api/users"] });
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editingUsers, setEditingUsers] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newFirstNameEn, setNewFirstNameEn] = useState("");
  const [newRole, setNewRole] = useState("household");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AuthUser | null>(null);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role, canApprove, canAddShortages, canApproveTrips }: { id: string; role: string; canApprove: boolean; canAddShortages?: boolean; canApproveTrips?: boolean }) => {
      await apiRequest("PATCH", `/api/users/${id}/role`, { role, canApprove, canAddShortages, canApproveTrips });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: t("admin.userRoleUpdated") }); },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; firstName: string; firstNameEn: string; role: string }) => {
      const res = await apiRequest("POST", "/api/admin/create-user", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("admin.userCreated") });
      setShowAddForm(false);
      setNewUsername("");
      setNewPassword("");
      setNewFirstName("");
      setNewFirstNameEn("");
      setNewRole("household");
    },
    onError: (err: any) => {
      toast({ title: err?.message || t("admin.usernameExists"), variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string; isSuspended: boolean }) => {
      await apiRequest("PATCH", `/api/users/${id}/suspend`, { isSuspended });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: variables.isSuspended ? t("admin.userSuspended") : t("admin.userActivated") });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("admin.userDeleted") });
      setDeleteConfirmUser(null);
    },
  });

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleEditing = (userId: string) => {
    setEditingUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  const roles = ["admin", "household", "maid", "driver"] as const;
  const sortedUsers = [...(allUsers || [])].sort((a, b) => (a.username || "").localeCompare(b.username || ""));
  const isSelf = (userId: string) => currentUser?.id === userId;

  const handleCreateUser = () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    createUserMutation.mutate({
      username: newUsername.trim(),
      password: newPassword.trim(),
      firstName: newFirstName.trim(),
      firstNameEn: newFirstNameEn.trim(),
      role: newRole,
    });
  };

  return (
    <div className="space-y-3">
        <Button
          variant={showAddForm ? "secondary" : "default"}
          className="w-full gap-2"
          onClick={() => setShowAddForm(!showAddForm)}
          data-testid="button-toggle-add-user"
        >
          <UserPlus className="w-4 h-4" />
          {t("admin.addUser")}
        </Button>

        {showAddForm && (
          <Card data-testid="card-add-user-form">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder={t("auth.username")}
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                data-testid="input-new-username"
              />
              <Input
                type="password"
                placeholder={t("auth.password")}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
              <Input
                placeholder={t("auth.firstName")}
                value={newFirstName}
                onChange={e => setNewFirstName(e.target.value)}
                data-testid="input-new-firstname"
              />
              <Input
                placeholder={t("auth.nameEn")}
                value={newFirstNameEn}
                onChange={e => setNewFirstNameEn(e.target.value)}
                data-testid="input-new-name-en"
              />
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role} value={role} data-testid={`option-role-${role}`}>
                      {t(`roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full gap-2"
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending || !newUsername.trim() || !newPassword.trim()}
                data-testid="button-create-user"
              >
                <Plus className="w-4 h-4" />
                {t("admin.addUser")}
              </Button>
            </CardContent>
          </Card>
        )}

        {sortedUsers.map(u => (
          <Card key={u.id} className={u.isSuspended ? "opacity-60" : ""} data-testid={`card-user-${u.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{displayName(u)[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{displayName(u)}</span>
                    {u.isSuspended && (
                      <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                        {t("admin.suspended")}
                      </Badge>
                    )}
                  </div>
                  {u.username && <span className="text-xs text-muted-foreground block">@{u.username}</span>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => toggleExpand(u.id)} data-testid={`button-expand-${u.id}`}>
                  {expandedUsers.has(u.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
              {!isSelf(u.id) && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-1.5 flex-wrap">
                    {roles.map(role => (
                      <Button key={role} size="sm" variant="outline"
                        className={u.role === role ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500" : ""}
                        onClick={() => updateRoleMutation.mutate({ id: u.id, role, canApprove: role === "admin" ? true : u.canApprove })}
                        disabled={updateRoleMutation.isPending || u.isSuspended} data-testid={`button-role-${role}-${u.id}`}>
                        {t(`roles.${role}`)}
                      </Button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline"
                    className={u.canApprove ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500" : ""}
                    onClick={() => updateRoleMutation.mutate({ id: u.id, role: u.role, canApprove: !u.canApprove })}
                    disabled={updateRoleMutation.isPending || u.isSuspended} data-testid={`button-toggle-approve-${u.id}`}>
                    {t("admin.approvePermission")}
                  </Button>
                  <Button size="sm" variant="outline"
                    className={u.canAddShortages ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500" : ""}
                    onClick={() => updateRoleMutation.mutate({ id: u.id, role: u.role, canApprove: u.canApprove, canAddShortages: !u.canAddShortages })}
                    disabled={updateRoleMutation.isPending || u.isSuspended} data-testid={`button-toggle-shortages-${u.id}`}>
                    {t("shortages.permission")}
                  </Button>
                  <Button size="sm" variant="outline"
                    className={u.canApproveTrips ? "bg-green-600 text-white border-green-600 dark:bg-green-500 dark:border-green-500" : ""}
                    onClick={() => updateRoleMutation.mutate({ id: u.id, role: u.role, canApprove: u.canApprove, canApproveTrips: !u.canApproveTrips })}
                    disabled={updateRoleMutation.isPending || u.isSuspended} data-testid={`button-toggle-approve-trips-${u.id}`}>
                    {t("trips.approvePermission")}
                  </Button>
                </div>
              )}
              {isSelf(u.id) && (
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">
                  {t("admin.currentUser")}
                </Badge>
              )}
              {expandedUsers.has(u.id) && (
                <>
                  {!isSelf(u.id) && <UserRoomAssignment userId={u.id} lang={lang} />}
                  {editingUsers.has(u.id) && !isSelf(u.id) && (
                    <EditUserForm user={u} onClose={() => toggleEditing(u.id)} />
                  )}
                  {!isSelf(u.id) && (
                    <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap">
                      {!editingUsers.has(u.id) && (
                        <Button size="sm" variant="outline"
                          className="gap-1.5"
                          onClick={() => toggleEditing(u.id)}
                          data-testid={`button-edit-${u.id}`}>
                          <Pencil className="w-4 h-4" />
                          {t("admin.editUser")}
                        </Button>
                      )}
                      <Button size="sm" variant={u.isSuspended ? "default" : "destructive"}
                        className="gap-1.5"
                        onClick={() => suspendMutation.mutate({ id: u.id, isSuspended: !u.isSuspended })}
                        disabled={suspendMutation.isPending} data-testid={`button-suspend-${u.id}`}>
                        {u.isSuspended ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        {u.isSuspended ? t("admin.activateUser") : t("admin.suspendUser")}
                      </Button>
                      <Button size="sm" variant="destructive"
                        className="gap-1.5"
                        onClick={() => setDeleteConfirmUser(u)}
                        data-testid={`button-delete-${u.id}`}>
                        <Trash2 className="w-4 h-4" />
                        {t("admin.deleteUser")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}

        <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => { if (!open) setDeleteConfirmUser(null); }}>
          <AlertDialogContent data-testid="dialog-confirm-delete-user">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("admin.deleteUser")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("admin.confirmDeleteUser")}
                {deleteConfirmUser && (
                  <span className="block mt-2 font-semibold text-foreground">
                    {displayName(deleteConfirmUser)} (@{deleteConfirmUser.username})
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">{t("admin.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => deleteConfirmUser && deleteUserMutation.mutate(deleteConfirmUser.id)}
                disabled={deleteUserMutation.isPending}
                data-testid="button-confirm-delete"
              >
                <Trash2 className="w-4 h-4" />
                {t("admin.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
