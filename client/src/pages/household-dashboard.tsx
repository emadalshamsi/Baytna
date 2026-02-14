import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, ClipboardList, ShoppingCart, Package } from "lucide-react";
import type { Order } from "@shared/schema";
import { t, formatPrice } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  return (
    <Badge className={`no-default-hover-elevate no-default-active-elevate ${variants[status] || ""}`}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export default function HouseholdDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "تم تحديث حالة الطلب" });
    },
  });

  const pendingOrders = orders?.filter(o => o.status === "pending") || [];
  const activeOrders = orders?.filter(o => o.status === "approved" || o.status === "in_progress") || [];
  const completedOrders = orders?.filter(o => o.status === "completed") || [];

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
            <span className="text-xl font-bold block">{pendingOrders.length}</span>
            <span className="text-xs text-muted-foreground">معلق</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ClipboardList className="w-5 h-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold block">{activeOrders.length}</span>
            <span className="text-xs text-muted-foreground">نشط</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Check className="w-5 h-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
            <span className="text-xl font-bold block">{completedOrders.length}</span>
            <span className="text-xs text-muted-foreground">مكتمل</span>
          </CardContent>
        </Card>
      </div>

      {pendingOrders.length > 0 && user?.canApprove && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">طلبات بحاجة لاعتماد</h3>
          {pendingOrders.map(order => (
            <Card key={order.id} data-testid={`card-household-order-${order.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <span className="font-medium">#{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {formatPrice(order.totalEstimated || 0)}
                </div>
                {order.notes && <p className="text-sm text-muted-foreground mb-2">{order.notes}</p>}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: order.id, status: "approved" })} disabled={statusMutation.isPending} data-testid={`button-approve-${order.id}`}>
                    <Check className="w-4 h-4 ml-1" /> {t("actions.approve")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: order.id, status: "rejected" })} disabled={statusMutation.isPending} data-testid={`button-reject-${order.id}`}>
                    <X className="w-4 h-4 ml-1" /> {t("actions.reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pendingOrders.length > 0 && !user?.canApprove && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">طلبات معلقة</h3>
          {pendingOrders.map(order => (
            <Card key={order.id} data-testid={`card-household-order-${order.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-medium">#{order.id}</span>
                  <span className="text-sm text-muted-foreground mr-2">{formatPrice(order.totalEstimated || 0)}</span>
                </div>
                <StatusBadge status={order.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeOrders.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">طلبات نشطة</h3>
          {activeOrders.map(order => (
            <Card key={order.id} data-testid={`card-household-active-${order.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-medium">#{order.id}</span>
                  <span className="text-sm text-muted-foreground mr-2">{formatPrice(order.totalEstimated || 0)}</span>
                </div>
                <StatusBadge status={order.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completedOrders.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">طلبات مكتملة</h3>
          {completedOrders.slice(0, 5).map(order => (
            <Card key={order.id} data-testid={`card-household-completed-${order.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-medium">#{order.id}</span>
                  <span className="text-sm text-muted-foreground mr-2">
                    {order.totalActual ? formatPrice(order.totalActual) : formatPrice(order.totalEstimated || 0)}
                  </span>
                </div>
                <StatusBadge status={order.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!orders?.length && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("messages.noOrders")}</p>
        </div>
      )}
    </div>
  );
}
