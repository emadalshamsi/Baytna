import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, Check, Package, Clock, ListChecks, ChevronLeft, Upload, ExternalLink, Store as StoreIcon, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import type { Order, OrderItem, Product, Store } from "@shared/schema";
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
  const { data: allStores } = useQuery<Store[]>({ queryKey: ["/api/stores"] });
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [receiptUrl, setReceiptUrl] = useState(order.receiptImageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status });
      if (status === "in_progress") {
        await apiRequest("PATCH", `/api/orders/${order.id}/driver`, {});
      }
      return status;
    },
    onSuccess: (status: string) => {
      setCurrentStatus(status);
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

      await apiRequest("PATCH", `/api/orders/${order.id}/actual`, { totalActual: total, receiptImageUrl: receiptUrl || undefined });
      await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: "completed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", order.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: t("status.completed") });
      onClose();
    },
  });

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setReceiptUrl(data.imageUrl);
        await apiRequest("PATCH", `/api/orders/${order.id}/actual`, {
          totalActual: order.totalActual || 0,
          receiptImageUrl: data.imageUrl,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        toast({ title: t("messages.receiptUploaded") });
      }
    } catch {}
    setUploading(false);
  };

  const getProduct = (productId: number) => products?.find(pr => pr.id === productId);
  const getProductName = (productId: number) => getProduct(productId)?.nameAr || `#${productId}`;

  const getStoreName = (storeId: number | null) => {
    if (!storeId) return t("driver.noStore");
    const s = allStores?.find(st => st.id === storeId);
    return s?.nameAr || t("driver.noStore");
  };

  const getStoreWebsite = (storeId: number | null) => {
    if (!storeId) return null;
    const s = allStores?.find(st => st.id === storeId);
    return s?.websiteUrl || null;
  };

  const groupItemsByStore = () => {
    if (!items || !products) return [];
    const groups: Record<string, { storeId: number | null; storeName: string; websiteUrl: string | null; items: OrderItem[] }> = {};

    for (const item of items) {
      const product = getProduct(item.productId);
      const storeId = product?.storeId || null;
      const key = storeId ? String(storeId) : "none";
      if (!groups[key]) {
        groups[key] = {
          storeId,
          storeName: getStoreName(storeId),
          websiteUrl: getStoreWebsite(storeId),
          items: [],
        };
      }
      groups[key].items.push(item);
    }
    return Object.values(groups);
  };

  const storeGroups = groupItemsByStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-back-orders">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold">#{order.id}</h2>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      {order.notes && (
        <Card>
          <CardContent className="p-3">
            <span className="text-sm text-muted-foreground">{t("fields.notes")}: </span>
            <span className="text-sm">{order.notes}</span>
          </CardContent>
        </Card>
      )}

      {currentStatus === "approved" && (
        <Button className="w-full gap-2" onClick={() => statusMutation.mutate("in_progress")} disabled={statusMutation.isPending} data-testid="button-start-shopping">
          <Truck className="w-4 h-4" /> {t("driver.startShopping")}
        </Button>
      )}

      {loadingItems ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : storeGroups.length > 1 ? (
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <StoreIcon className="w-4 h-4" /> {t("driver.groupedByStore")}
          </h3>
          {storeGroups.map((group, gi) => (
            <div key={gi} className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate gap-1">
                  <StoreIcon className="w-3 h-3" /> {group.storeName}
                </Badge>
                {group.websiteUrl && (
                  <a href={group.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1" data-testid={`link-store-${gi}`}>
                    {t("driver.visitWebsite")} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {group.items.map(item => renderItem(item))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">{t("driver.shoppingList")} ({items?.length || 0})</h3>
          {storeGroups[0]?.websiteUrl && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate gap-1">
                <StoreIcon className="w-3 h-3" /> {storeGroups[0].storeName}
              </Badge>
              <a href={storeGroups[0].websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                {t("driver.visitWebsite")} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {items?.map(item => renderItem(item))}
        </div>
      )}

      {currentStatus === "in_progress" && (
        <div className="space-y-3">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload-receipt">
            <Upload className="w-4 h-4" /> {uploading ? t("auth.loading") : t("fields.uploadReceipt")}
          </Button>
          {receiptUrl && (
            <div className="relative w-full h-40 rounded-md overflow-hidden bg-muted">
              <img src={receiptUrl} alt={t("fields.receipt")} className="w-full h-full object-contain" />
            </div>
          )}
          <Button className="w-full gap-2" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} data-testid="button-complete-order">
            <Check className="w-4 h-4" /> {t("driver.completePurchase")}
          </Button>
        </div>
      )}
    </div>
  );

  function renderItem(item: OrderItem) {
    const product = getProduct(item.productId);
    return (
      <Card key={item.id} data-testid={`card-order-item-${item.id}`}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {currentStatus === "in_progress" && (
                <Checkbox
                  checked={checked[item.id] || item.isPurchased}
                  onCheckedChange={(v) => setChecked(prev => ({ ...prev, [item.id]: !!v }))}
                  data-testid={`checkbox-item-${item.id}`}
                />
              )}
              <div className="flex items-center gap-2">
                {product?.imageUrl && (
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img src={product.imageUrl} alt={product.nameAr} className="w-full h-full object-cover" />
                  </div>
                )}
                <span className={`font-medium text-sm ${(checked[item.id] || item.isPurchased) ? "line-through text-muted-foreground" : ""}`}>
                  {getProductName(item.productId)}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">x{item.quantity}</Badge>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
            <span>{t("fields.estimatedPrice")}: {formatPrice(item.estimatedPrice || 0)}</span>
            {currentStatus === "in_progress" && (
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
    );
  }
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
                <div className="flex items-center gap-2">
                  {o.receiptImageUrl && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                  <StatusBadge status={o.status} />
                </div>
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
