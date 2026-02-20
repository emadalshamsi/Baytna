import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, Check, Package, Clock, ListChecks, ChevronLeft, Upload, ExternalLink, Store as StoreIcon, Image as ImageIcon, MapPin, Play, Pause, Square, Car, AlertTriangle, Cog } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Order, OrderItem, Product, Store, Trip, Vehicle, SparePartOrder, SparePartOrderItem, SparePart } from "@shared/schema";
import { t, formatPrice, formatDateTime, imgUrl, localName, productDisplayName } from "@/lib/i18n";
import { SarIcon } from "@/components/sar-icon";
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

type DriverAvailability = { busy: boolean; activeTrips: { id: number; personName: string; location: string; status: string }[]; activeOrders: { id: number; status: string }[] };

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  useLang();
  const { toast } = useToast();
  const { data: currentUser } = useQuery<{ id: string }>({ queryKey: ["/api/auth/user"] });
  const { data: items, isLoading: loadingItems } = useQuery<OrderItem[]>({ queryKey: ["/api/orders", order.id, "items"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: allStores } = useQuery<Store[]>({ queryKey: ["/api/stores"] });
  const { data: driverAvailability } = useQuery<DriverAvailability>({
    queryKey: ["/api/drivers", currentUser?.id, "availability"],
    enabled: !!currentUser?.id && order.status === "approved",
  });
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
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/drivers", currentUser.id, "availability"] });
      }
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
      const { compressImage } = await import("@/lib/image-compress");
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressed);
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
  const getProductName = (productId: number) => { const p = getProduct(productId); return p ? productDisplayName(p) : `#${productId}`; };

  const getStoreName = (storeId: number | null) => {
    if (!storeId) return t("driver.noStore");
    const s = allStores?.find(st => st.id === storeId);
    return s ? localName(s) : t("driver.noStore");
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
        <div className="space-y-2">
          {driverAvailability?.busy && (
            <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" data-testid="alert-driver-conflict-order">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{t("conflict.driverBusy")}</span>
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 mr-6">
                {driverAvailability.activeTrips.map(tr => (
                  <div key={tr.id}>{t("conflict.tripTo")} {tr.location} ({t(`status.${tr.status}`)})</div>
                ))}
                {driverAvailability.activeOrders.map(o => (
                  <div key={o.id}>{t("conflict.orderNum")}{o.id} ({t("conflict.activeShopping")})</div>
                ))}
              </div>
            </div>
          )}
          <Button className="w-full gap-2" onClick={() => statusMutation.mutate("in_progress")} disabled={statusMutation.isPending} data-testid="button-start-shopping">
            <Truck className="w-4 h-4" /> {t("driver.startShopping")}
          </Button>
        </div>
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
                    <img src={imgUrl(product.imageUrl)} alt={localName(product)} className="w-full h-full object-cover" />
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
            <span className="inline-flex items-center gap-0.5">{t("fields.estimatedPrice")}: {formatPrice(item.estimatedPrice || 0)} <SarIcon className="w-2.5 h-2.5 inline-block" /></span>
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
            {item.actualPrice && <span className="inline-flex items-center gap-0.5">{t("fields.actualPrice")}: {formatPrice(item.actualPrice)} <SarIcon className="w-2.5 h-2.5 inline-block" /></span>}
          </div>
        </CardContent>
      </Card>
    );
  }
}

function WaitingTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="font-mono text-sm font-bold text-orange-600 dark:text-orange-400" data-testid="text-waiting-timer">
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

function TripsSection() {
  useLang();
  const { toast } = useToast();
  const { data: currentUser } = useQuery<{ id: string }>({ queryKey: ["/api/auth/user"] });
  const { data: trips, isLoading } = useQuery<Trip[]>({ queryKey: ["/api/trips"] });
  const { data: allVehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: driverAvailability } = useQuery<DriverAvailability>({
    queryKey: ["/api/drivers", currentUser?.id, "availability"],
    enabled: !!currentUser?.id,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/trips/${id}/status`, { status });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/drivers", currentUser.id, "availability"] });
      }
      const msgKey = vars.status === "started" ? "driver.tripStarted" : vars.status === "waiting" ? "driver.tripWaiting" : "driver.tripCompleted";
      toast({ title: t(msgKey) });
    },
  });

  const getVehicleName = (vid: number | null) => {
    if (!vid) return "";
    return allVehicles?.find(v => v.id === vid)?.name || "";
  };

  const formatWaiting = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} ${t("trips.minutes")} ${secs} ${t("trips.seconds")}`;
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  const approvedTrips = trips?.filter(tr => tr.status === "approved") || [];
  const startedTrips = trips?.filter(tr => tr.status === "started") || [];
  const waitingTrips = trips?.filter(tr => tr.status === "waiting") || [];
  const completedTrips = trips?.filter(tr => tr.status === "completed") || [];
  const activeTrips = [...startedTrips, ...waitingTrips];

  const tripStatusVariants: Record<string, string> = {
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    started: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    waiting: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };

  if (!approvedTrips.length && !activeTrips.length && !completedTrips.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" /> {t("driver.myTrips")}
      </h2>

      {activeTrips.length > 0 && (
        <div className="space-y-2">
          {activeTrips.map(trip => (
            <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{trip.personName}</span>
                  </div>
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${tripStatusVariants[trip.status] || ""}`}>
                    {t(`status.${trip.status}`)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>{t("trips.location")}: {trip.location}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Clock className="w-3 h-3" />
                    <span className="text-foreground/80 font-medium">{formatDateTime(trip.departureTime)}</span>
                  </div>
                  {trip.vehicleId && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Car className="w-3 h-3" />
                      <span>{getVehicleName(trip.vehicleId)}</span>
                    </div>
                  )}
                  {trip.notes && <div>{trip.notes}</div>}
                </div>

                {!trip.isPersonal && trip.status === "waiting" && trip.waitingStartedAt && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-900/20">
                    <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm text-orange-700 dark:text-orange-300">{t("driver.waitingTime")}:</span>
                    <WaitingTimer startedAt={trip.waitingStartedAt as unknown as string} />
                  </div>
                )}

                {!trip.isPersonal && (
                  <div className="flex gap-2 flex-wrap">
                    {trip.status === "started" && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => statusMutation.mutate({ id: trip.id, status: "waiting" })} disabled={statusMutation.isPending} data-testid={`button-wait-trip-${trip.id}`}>
                        <MapPin className="w-4 h-4" /> {t("driver.arrivedAtLocation")}
                      </Button>
                    )}
                    <Button size="sm" className="gap-1.5" onClick={() => statusMutation.mutate({ id: trip.id, status: "completed" })} disabled={statusMutation.isPending} data-testid={`button-complete-trip-${trip.id}`}>
                      <Square className="w-4 h-4" /> {t("driver.completeTrip")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {approvedTrips.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {t("status.approved")} ({approvedTrips.length})
          </h3>
          {approvedTrips.map(trip => (
            <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-medium">{trip.personName}</span>
                    <div className="text-sm text-muted-foreground">{trip.location}</div>
                  </div>
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${tripStatusVariants.approved}`}>
                    {t("status.approved")}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <Clock className="w-3 h-3" />
                  <span className="text-foreground/80 font-medium">{formatDateTime(trip.departureTime)}</span>
                  {trip.vehicleId && (
                    <>
                      <Car className="w-3 h-3" />
                      <span>{getVehicleName(trip.vehicleId)}</span>
                    </>
                  )}
                </div>
                {trip.notes && <p className="text-sm text-muted-foreground">{trip.notes}</p>}
                {driverAvailability?.busy && (
                  <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" data-testid={`alert-trip-conflict-${trip.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-300">{t("conflict.driverBusy")}</span>
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 mr-5">
                      {driverAvailability.activeTrips.map(tr => (
                        <div key={tr.id}>{t("conflict.tripTo")} {tr.location} ({t(`status.${tr.status}`)})</div>
                      ))}
                      {driverAvailability.activeOrders.map(o => (
                        <div key={o.id}>{t("conflict.orderNum")}{o.id} ({t("conflict.activeShopping")})</div>
                      ))}
                    </div>
                  </div>
                )}
                {!trip.isPersonal && (
                  <Button size="sm" className="gap-1.5" onClick={() => statusMutation.mutate({ id: trip.id, status: "started" })} disabled={statusMutation.isPending} data-testid={`button-start-trip-${trip.id}`}>
                    <Play className="w-4 h-4" /> {t("driver.startTrip")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completedTrips.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <ListChecks className="w-4 h-4 text-green-600 dark:text-green-400" /> {t("status.completed")} ({completedTrips.length})
          </h3>
          {completedTrips.map(trip => (
            <Card key={trip.id} data-testid={`card-trip-${trip.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-medium">{trip.personName}</span>
                    <div className="text-sm text-muted-foreground">{trip.location}</div>
                  </div>
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${tripStatusVariants.completed}`}>
                    {t("status.completed")}
                  </Badge>
                </div>
                {trip.waitingDuration && trip.waitingDuration > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("driver.waitingTime")}: {formatWaiting(trip.waitingDuration)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SparePartOrderCard({ order, onStatusChange }: { order: SparePartOrder; onStatusChange: (id: number, status: string) => void }) {
  useLang();
  const { data: items } = useQuery<SparePartOrderItem[]>({ queryKey: ["/api/spare-part-orders", order.id, "items"] });
  const { data: allParts } = useQuery<SparePart[]>({ queryKey: ["/api/spare-parts"] });
  const [expanded, setExpanded] = useState(false);

  const getPartName = (partId: number) => {
    const part = allParts?.find(p => p.id === partId);
    return part ? (localName(part) || part.nameAr) : `#${partId}`;
  };

  return (
    <Card data-testid={`card-driver-sp-order-${order.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <Cog className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">#{order.id}</span>
            <span className="text-sm text-muted-foreground inline-flex items-center gap-0.5">
              {formatPrice(order.totalEstimated || 0)} <SarIcon className="w-3 h-3 inline-block" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="no-default-hover-elevate no-default-active-elevate bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-[10px]">
              {t("spareParts.title")}
            </Badge>
            <StatusBadge status={order.status} />
          </div>
        </div>
        {expanded && items && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{getPartName(item.sparePartId)} x{item.quantity}</span>
                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                  {formatPrice(item.price || 0)} <SarIcon className="w-2.5 h-2.5" />
                </span>
              </div>
            ))}
            {order.notes && <p className="text-xs text-muted-foreground">{order.notes}</p>}
          </div>
        )}
        {order.status === "approved" && (
          <Button size="sm" className="mt-2 gap-1" onClick={() => onStatusChange(order.id, "in_progress")} data-testid={`button-start-sp-order-${order.id}`}>
            <Play className="w-3 h-3" /> {t("status.in_progress")}
          </Button>
        )}
        {order.status === "in_progress" && (
          <Button size="sm" className="mt-2 gap-1" onClick={() => onStatusChange(order.id, "completed")} data-testid={`button-complete-sp-order-${order.id}`}>
            <Check className="w-3 h-3" /> {t("status.completed")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DriverDashboard() {
  useLang();
  const { toast } = useToast();
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: sparePartOrders, isLoading: spLoading } = useQuery<SparePartOrder[]>({ queryKey: ["/api/spare-part-orders"] });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const spStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/spare-part-orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spare-part-orders"] });
    },
  });

  if (selectedOrder) {
    return <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />;
  }

  const approved = orders?.filter(o => o.status === "approved") || [];
  const inProgress = orders?.filter(o => o.status === "in_progress") || [];
  const completed = orders?.filter(o => o.status === "completed") || [];

  const spApproved = sparePartOrders?.filter(o => o.status === "approved") || [];
  const spInProgress = sparePartOrders?.filter(o => o.status === "in_progress") || [];
  const spCompleted = sparePartOrders?.filter(o => o.status === "completed") || [];

  const handleSpStatusChange = (id: number, status: string) => {
    spStatusMutation.mutate({ id, status });
  };

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
                  <span className="text-sm text-muted-foreground mr-2 inline-flex items-center gap-0.5">{formatPrice(o.totalEstimated || 0)} <SarIcon className="w-3 h-3 inline-block" /></span>
                </div>
                <StatusBadge status={o.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {spInProgress.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Cog className="w-4 h-4 text-purple-600 dark:text-purple-400" /> {t("spareParts.title")} - {t("status.in_progress")} ({spInProgress.length})
          </h3>
          {spInProgress.map(o => <SparePartOrderCard key={o.id} order={o} onStatusChange={handleSpStatusChange} />)}
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
                  <span className="text-sm text-muted-foreground mr-2 inline-flex items-center gap-0.5">{formatPrice(o.totalEstimated || 0)} <SarIcon className="w-3 h-3 inline-block" /></span>
                </div>
                <StatusBadge status={o.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {spApproved.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Cog className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {t("spareParts.title")} - {t("status.approved")} ({spApproved.length})
          </h3>
          {spApproved.map(o => <SparePartOrderCard key={o.id} order={o} onStatusChange={handleSpStatusChange} />)}
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
                  <span className="text-sm text-muted-foreground mr-2 inline-flex items-center gap-0.5">
                    {o.totalActual ? formatPrice(o.totalActual) : formatPrice(o.totalEstimated || 0)} <SarIcon className="w-3 h-3 inline-block" />
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

      {spCompleted.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Cog className="w-4 h-4 text-green-600 dark:text-green-400" /> {t("spareParts.title")} - {t("status.completed")} ({spCompleted.length})
          </h3>
          {spCompleted.map(o => <SparePartOrderCard key={o.id} order={o} onStatusChange={handleSpStatusChange} />)}
        </div>
      )}

      {(isLoading || spLoading) && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>}

      {!isLoading && !spLoading && !approved.length && !inProgress.length && !completed.length && !spApproved.length && !spInProgress.length && !spCompleted.length && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("messages.noOrders")}</p>
        </div>
      )}
    </div>
  );
}
