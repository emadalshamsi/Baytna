import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ban, UserCheck } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/App";
import type { AuthUser } from "@/hooks/use-auth";

export default function AdminUsers() {
  useLang();
  const { toast } = useToast();
  const { data: allUsers, isLoading } = useQuery<AuthUser[]>({ queryKey: ["/api/users"] });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role, canApprove, canAddShortages }: { id: string; role: string; canApprove: boolean; canAddShortages?: boolean }) => {
      await apiRequest("PATCH", `/api/users/${id}/role`, { role, canApprove, canAddShortages });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: t("admin.userRoleUpdated") }); },
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

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  const roles = ["admin", "household", "maid", "driver"] as const;

  return (
    <div className="space-y-3">
        {allUsers?.map(u => (
          <Card key={u.id} className={u.isSuspended ? "opacity-60" : ""} data-testid={`card-user-${u.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{(u.firstName || u.username || "?")[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{u.firstName || u.username || t("roles.household")}</span>
                    {u.isSuspended && (
                      <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                        {t("admin.suspended")}
                      </Badge>
                    )}
                  </div>
                  {u.username && <span className="text-xs text-muted-foreground block">@{u.username}</span>}
                </div>
              </div>
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
                  className={u.canAddShortages ? "bg-green-600 text-white border-green-600 dark:bg-green-500 dark:border-green-500" : ""}
                  onClick={() => updateRoleMutation.mutate({ id: u.id, role: u.role, canApprove: u.canApprove, canAddShortages: !u.canAddShortages })}
                  disabled={updateRoleMutation.isPending || u.isSuspended} data-testid={`button-toggle-shortages-${u.id}`}>
                  {t("shortages.permission")}
                </Button>
              </div>
              <div className="mt-3 pt-3 border-t">
                <Button size="sm" variant={u.isSuspended ? "default" : "destructive"}
                  className="gap-1.5"
                  onClick={() => suspendMutation.mutate({ id: u.id, isSuspended: !u.isSuspended })}
                  disabled={suspendMutation.isPending} data-testid={`button-suspend-${u.id}`}>
                  {u.isSuspended ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  {u.isSuspended ? t("admin.activateUser") : t("admin.suspendUser")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
