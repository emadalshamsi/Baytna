import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, Check, Package, Clock, ListChecks, ChevronLeft } from "lucide-react";
import { useState } from "react";
import type { Order, OrderItem, Product } from "@shared/schema";
import { t, formatPrice } from "@/lib/i18n";
import { useLang } from "@/App";

function StatusBadge({ status }: { status: string }) {
  useLang();
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

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  useLang();
  const { toast } = useToast();
  const { data: items, isLoading: loadingItems } = useQuery<OrderItem[]>({ queryKey: ["/api/orders", order.id, "items"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status });
      if (status === "in_progress") {
        await apiRequest("PATCH", `/api/orders/${order.id}/driver`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: t("admin.orderStatusUpdated") });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const total = items?.reduce((sum, item) => {
        const price = prices[item.id] ? parseInt(prices[item.id]) : (item.actualPrice || item.estimatedPrice || 0);
        return sum + price;
      }, 0) || 0;

      for (const item of items || []) {
        if (prices[item.id] || checked[item.id]) {
          await apiRequest("PATCH", `/api/order-items/${item.id}`, {
            actualPrice: prices[item.id] ? parseInt(prices[item.id]) : undefined,
            isPurchased: checked[item.id] || false,
          });
        }
      }

      await apiRequest("PATCH", `/api/orders/${order.id}/actual`, { totalActual: total });
      await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "completed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", order.id, "items"] });
      toast({ title: t("status.completed") });
      onClose();
    },
  });

  const getProductName = (productId: number) => {
    const p = products?.find(pr => pr.id === productId);
    return p?.nameAr || `#${productId}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-back-orders">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold">#{order.id}</h2>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.notes && (
        <Card>
          <CardContent className="p-3">
            <span className="text-sm text-muted-foreground">{t("fields.notes")}: </span>
            <span className="text-sm">{order.notes}</span>
          </CardContent>
        </Card>
      )}

      {order.status === "approved" && (
        <Button className="w-full gap-2" onClick={() => statusMutation.mutate("in_progress")} disabled={statusMutation.isPending} data-testid="button-start-shopping">
          <Truck className="w-4 h-4" /> {t("driver.startShopping")}
        </Button>
      )}

      {loadingItems ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">{t("driver.shoppingList")} ({items?.length || 0})</h3>
          {items?.map(item => (
            <Card key={item.id} data-testid={`card-order-item-${item.id}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {order.status === "in_progress" && (
                      <Checkbox
                        checked={checked[item.id] || item.isPurchased}
                        onCheckedChange={(v) => setChecked(prev => ({ ...prev, [item.id]: !!v }))}
                        data-testid={`checkbox-item-${item.id}`}
                      />
                    )}
                    <span className={`font-medium text-sm ${(checked[item.id] || item.isPurchased) ? "line-through text-muted-foreground" : ""}`}>
                      {getProductName(item.productId)}
                    </span>
                  </div>
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">x{item.quantity}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
                  <span>{t("fields.estimatedPrice")}: {formatPrice(item.estimatedPrice || 0)}</span>
                  {order.status === "in_progress" && (
                    <Input
                      type="number"
                      placeholder={t("fields.actualPrice")}
                      className="w-28 h-8 text-xs"
                      value={prices[item.id] || ""}
                      onChange={e => setPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                      data-testid={`input-actual-price-${item.id}`}
                    />
                  )}
                  {item.actualPrice && <span>{t("fields.actualPrice")}: {formatPrice(item.actualPrice)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {order.status === "in_progress" && (
        <Button className="w-full gap-2" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} data-testid="button-complete-order">
          <Check className="w-4 h-4" /> {t("driver.completePurchase")}
        </Button>
      )}
    </div>
  );
}

export default function DriverDashboard() {
  useLang();
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  if (selectedOrder) {
    return <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />;
  }

  const approved = orders?.filter(o => o.status === "approved") || [];
  const inProgress = orders?.filter(o => o.status === "in_progress") || [];
  const completed = orders?.filter(o => o.status === "completed") || [];

  return (
    <div className="space-y-4">
      {inProgress.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" /> {t("status.in_progress")} ({inProgress.length})
          </h3>
          {inProgress.map(o => (
            <Card key={o.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedOrder(o)} data-testid={`card-driver-order-${o.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-medium">#{o.id}</span>
                  <span className="text-sm text-muted-foreground mr-2">{formatPrice(o.totalEstimated || 0)}</span>
                </div>
                <StatusBadge status={o.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {t("status.approved")} ({approved.length})
          </h3>
          {approved.map(o => (
            <Card key={o.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedOrder(o)} data-testid={`card-driver-order-${o.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-medium">#{o.id}</span>
                  <span className="text-sm text-muted-foreground mr-2">{formatPrice(o.totalEstimated || 0)}</span>
                </div>
                <StatusBadge status={o.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <ListChecks className="w-4 h-4 text-green-600 dark:text-green-400" /> {t("status.completed")} ({completed.length})
          </h3>
          {completed.map(o => (
            <Card key={o.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedOrder(o)} data-testid={`card-driver-order-${o.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-medium">#{o.id}</span>
                  <span className="text-sm text-muted-foreground mr-2">
                    {o.totalActual ? formatPrice(o.totalActual) : formatPrice(o.totalEstimated || 0)}
                  </span>
                </div>
                <StatusBadge status={o.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>}

      {!isLoading && !approved.length && !inProgress.length && !completed.length && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("messages.noOrders")}</p>
        </div>
      )}
    </div>
  );
}
