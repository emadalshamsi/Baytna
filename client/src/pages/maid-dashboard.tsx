import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Send, Package, Plus, Minus, X, Image as ImageIcon, RefreshCw, Clock, CalendarDays, Zap,
  ChevronDown, ChevronUp, Check, ClipboardList
} from "lucide-react";
import { useState } from "react";
import type { Product, Category, Order, OrderItem } from "@shared/schema";
import { t, imgUrl, localName, productDisplayName } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { ShortagesSection } from "@/pages/admin-shopping";
import { getIcon } from "@/lib/category-icons";

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

function MaidOrderDetailPanel({ orderId, editable = false, currentScheduledFor }: { orderId: number; editable?: boolean; currentScheduledFor?: string | null }) {
  useLang();
  const { toast } = useToast();
  const { data: items, isLoading } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", orderId, "items"],
    queryFn: () => fetch(`/api/orders/${orderId}/items`, { credentials: "include" }).then(r => r.json()),
  });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addQuantity, setAddQuantity] = useState("1");
  const [productSearch, setProductSearch] = useState("");

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/order-items/${id}`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/order-items/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", `/api/orders/${orderId}/items`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowAddItem(false);
      setSelectedProductId("");
      setAddQuantity("1");
      setProductSearch("");
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (scheduledFor: string) => {
      await apiRequest("PATCH", `/api/orders/${orderId}/scheduled`, { scheduledFor });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: t("schedule.scheduleUpdated") });
    },
  });

  if (isLoading) return <Skeleton className="h-16 mt-2" />;

  const productMap = new Map((products || []).map(p => [p.id, p]));
  const existingProductIds = new Set((items || []).map(i => i.productId));
  const availableProducts = (products || []).filter(p => !existingProductIds.has(p.id));
  const filteredAvailable = productSearch
    ? availableProducts.filter(p => p.nameAr.includes(productSearch) || (p.nameEn && p.nameEn.toLowerCase().includes(productSearch.toLowerCase())))
    : availableProducts;

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const product = products?.find(p => p.id === parseInt(selectedProductId));
    if (!product) return;
    addItemMutation.mutate({
      productId: product.id,
      quantity: parseInt(addQuantity) || 1,
      estimatedPrice: product.estimatedPrice || 0,
    });
  };

  return (
    <div className="mt-3 border-t pt-3 space-y-2" data-testid={`maid-order-items-panel-${orderId}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground">{t("fields.orderItems")} ({items?.length || 0})</span>
        {editable && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddItem(!showAddItem)} data-testid={`button-maid-add-item-${orderId}`}>
            <Plus className="w-3 h-3" /> {t("household.addItemToOrder")}
          </Button>
        )}
      </div>

      {editable && showAddItem && (
        <div className="p-3 rounded-md bg-muted/50 space-y-2">
          <Input
            placeholder={t("actions.search")}
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            className="text-sm"
          />
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger>
              <SelectValue placeholder={t("admin.addProduct")} />
            </SelectTrigger>
            <SelectContent>
              {filteredAvailable.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {productDisplayName(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="number" min="1" value={addQuantity} onChange={e => setAddQuantity(e.target.value)} className="w-20 text-sm" />
            <Button size="sm" onClick={handleAddItem} disabled={!selectedProductId || addItemMutation.isPending}>
              <Plus className="w-3 h-3 ml-1" /> {t("actions.add")}
            </Button>
          </div>
        </div>
      )}

      {!items?.length ? (
        <p className="text-xs text-muted-foreground py-2">{t("fields.noItems")}</p>
      ) : (
        items.map(item => {
          const product = productMap.get(item.productId);
          return (
            <div key={item.id} className="flex items-center justify-between gap-2 flex-wrap text-sm py-1.5 border-b last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                {product?.imageUrl && <img src={imgUrl(product.imageUrl)} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                <div className="min-w-0">
                  <span className="font-medium text-sm truncate block">{product ? productDisplayName(product) : `#${item.productId}`}</span>
                  <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.isPurchased && (
                  <Badge className="no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                    <Check className="w-3 h-3" />
                  </Badge>
                )}
                {editable && !item.isPurchased && (
                  <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (item.quantity > 1) updateItemMutation.mutate({ id: item.id, data: { quantity: item.quantity - 1 } });
                    }} disabled={item.quantity <= 1 || updateItemMutation.isPending}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      updateItemMutation.mutate({ id: item.id, data: { quantity: item.quantity + 1 } });
                    }} disabled={updateItemMutation.isPending}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteItemMutation.mutate(item.id)} disabled={deleteItemMutation.isPending}>
                      <X className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {editable && (
        <div className="pt-2 border-t space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t("schedule.deliverySchedule")}</span>
          <div className="flex gap-1">
            {[
              { value: "today", icon: CalendarDays },
              { value: "tomorrow", icon: Clock },
            ].map(opt => {
              const today = new Date().toISOString().split("T")[0];
              const tmr = new Date();
              tmr.setDate(tmr.getDate() + 1);
              const tomorrowDate = tmr.toISOString().split("T")[0];
              const dateVal = opt.value === "tomorrow" ? tomorrowDate : today;
              const isActive = opt.value === "today"
                ? (currentScheduledFor === today || !currentScheduledFor)
                : currentScheduledFor === tomorrowDate;
              return (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className="flex-1 gap-1"
                  onClick={() => scheduleMutation.mutate(dateVal)}
                  disabled={scheduleMutation.isPending}
                  data-testid={`button-maid-schedule-${opt.value}-${orderId}`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {t(`schedule.${opt.value}` as any)}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaidDashboard() {
  useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: orders } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const [cart, setCart] = useState<{ productId: number; quantity: number; product: Product }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showUpdateOrder, setShowUpdateOrder] = useState(false);
  const [selectedOrderForUpdate, setSelectedOrderForUpdate] = useState<string>("");
  const [updateCart, setUpdateCart] = useState<{ productId: number; quantity: number; product: Product }[]>([]);
  const [scheduledFor, setScheduledFor] = useState<string>("today");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("shopping");

  const getScheduledDate = (val: string) => {
    const now = new Date();
    if (val === "now") return now.toISOString().split("T")[0];
    if (val === "tomorrow") {
      const tmr = new Date(now);
      tmr.setDate(tmr.getDate() + 1);
      return tmr.toISOString().split("T")[0];
    }
    return now.toISOString().split("T")[0];
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const totalEstimated = cart.reduce((sum, item) => sum + (item.product.estimatedPrice || 0) * item.quantity, 0);
      const res = await apiRequest("POST", "/api/orders", { notes, totalEstimated, scheduledFor: getScheduledDate(scheduledFor) });
      const order = await res.json();
      for (const item of cart) {
        await apiRequest("POST", `/api/orders/${order.id}/items`, {
          productId: item.productId,
          quantity: item.quantity,
          estimatedPrice: (item.product.estimatedPrice || 0) * item.quantity,
        });
      }
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setCart([]);
      setShowCart(false);
      setNotes("");
      setScheduledFor("today");
      toast({ title: t("messages.orderCreated") });
    },
  });

  const addToActiveOrderMutation = useMutation({
    mutationFn: async () => {
      const orderId = parseInt(selectedOrderForUpdate);
      for (const item of updateCart) {
        await apiRequest("POST", `/api/orders/${orderId}/items/maid`, {
          productId: item.productId,
          quantity: item.quantity,
          estimatedPrice: (item.product.estimatedPrice || 0) * item.quantity,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setUpdateCart([]);
      setShowUpdateOrder(false);
      setSelectedOrderForUpdate("");
      toast({ title: t("messages.itemAdded") });
    },
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.filter(i => i.productId !== product.id);
      return [...prev, { productId: product.id, quantity: 1, product }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.productId === productId) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }
      return i;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const addToUpdateCart = (product: Product) => {
    setUpdateCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, quantity: 1, product }];
    });
  };

  const removeFromUpdateCart = (productId: number) => {
    setUpdateCart(prev => prev.filter(i => i.productId !== productId));
  };

  const filteredProducts = selectedCategory !== null
    ? products?.filter(p => p.categoryId === selectedCategory)
    : products;

  const pendingOrders = orders?.filter(o => o.status === "pending") || [];
  const activeOrders = orders?.filter(o => o.status === "approved" || o.status === "in_progress") || [];
  const completedOrders = orders?.filter(o => o.status === "completed") || [];
  const inProgressOrders = orders?.filter(o => o.status === "in_progress") || [];

  const tabItems = [
    { value: "shopping", icon: ShoppingCart, label: t("nav.addItems") },
    { value: "orders", icon: ClipboardList, label: t("nav.orders") },
  ];

  if (user?.canAddShortages) {
    tabItems.push({ value: "shortages", icon: Package, label: t("shortages.title") });
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start gap-1 flex-nowrap overflow-x-auto">
          {tabItems.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1 shrink-0" data-testid={`tab-${tab.value}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="shopping">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{t("nav.addItems")}</h2>
              <div className="flex items-center gap-2">
                {inProgressOrders.length > 0 && (
                  <Button variant="outline" className="gap-2" onClick={() => setShowUpdateOrder(true)} data-testid="button-update-active-order">
                    <RefreshCw className="w-4 h-4" /> {t("maid.updateOrder")}
                  </Button>
                )}
                <Button className="gap-2 relative" onClick={() => setShowCart(true)} data-testid="button-view-cart">
                  <ShoppingCart className="w-5 h-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </Button>
              </div>
            </div>

      {categories && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button size="sm" variant={selectedCategory === null ? "default" : "outline"} onClick={() => setSelectedCategory(null)} data-testid="button-category-all">
            {t("maid.all")}
          </Button>
          {categories.map(c => {
            const Icon = getIcon(c.icon);
            return (
              <Button key={c.id} size="sm" variant={selectedCategory === c.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(c.id)} className="gap-1 whitespace-nowrap" data-testid={`button-category-${c.id}`}>
                <Icon className="w-4 h-4" /> {localName(c)}
              </Button>
            );
          })}
        </div>
      )}

      {loadingProducts ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : !filteredProducts?.length ? (
        <p className="text-center text-muted-foreground py-8">{t("messages.noProducts")}</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {filteredProducts.map(product => {
            const inCart = cart.find(i => i.productId === product.id);
            const catData = categories?.find(c => c.id === product.categoryId);
            const Icon = getIcon(catData?.icon || product.icon);
            return (
              <div key={product.id} className="flex flex-col">
                <button
                  onClick={() => addToCart(product)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-md border text-center transition-colors min-h-[100px] hover-elevate active-elevate-2 ${inCart ? "border-primary bg-primary/5" : "bg-card"}`}
                  data-testid={`button-add-product-${product.id}`}
                >
                  {product.imageUrl ? (
                    <div className="w-10 h-10 rounded-md overflow-hidden mb-2">
                      <img src={imgUrl(product.imageUrl)} alt={localName(product)} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <Icon className="w-8 h-8 mb-2 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium leading-tight">{productDisplayName(product)}</span>
                  {inCart && (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {inCart.quantity}
                    </span>
                  )}
                </button>
                {inCart && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => {
                      if (inCart.quantity <= 1) removeFromCart(product.id);
                      else updateQuantity(product.id, -1);
                    }} data-testid={`button-decrease-grid-${product.id}`}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-bold min-w-[20px] text-center">{inCart.quantity}</span>
                    <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateQuantity(product.id, 1)} data-testid={`button-increase-grid-${product.id}`}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
                  <span className="text-xl font-bold block" data-testid="text-pending-count">{pendingOrders.length}</span>
                  <span className="text-xs text-muted-foreground">{t("household.pendingLabel")}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <ClipboardList className="w-5 h-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                  <span className="text-xl font-bold block" data-testid="text-active-count">{activeOrders.length}</span>
                  <span className="text-xs text-muted-foreground">{t("household.activeLabel")}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Check className="w-5 h-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
                  <span className="text-xl font-bold block" data-testid="text-completed-count">{completedOrders.length}</span>
                  <span className="text-xs text-muted-foreground">{t("household.completedLabel")}</span>
                </CardContent>
              </Card>
            </div>

            {pendingOrders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">{t("household.pendingOrders")}</h3>
                {pendingOrders.map(order => (
                  <Card key={order.id} data-testid={`card-maid-order-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.id}</span>
                          {(() => {
                            const today = new Date().toISOString().split("T")[0];
                            const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
                            const isTomorrow = order.scheduledFor === tmr.toISOString().split("T")[0];
                            const isToday = !order.scheduledFor || order.scheduledFor === today;
                            return (
                              <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-[10px] gap-0.5">
                                {isTomorrow ? <Clock className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
                                {isTomorrow ? t("schedule.tomorrow") : isToday ? t("schedule.today") : order.scheduledFor}
                              </Badge>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <Button size="icon" variant="ghost" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} data-testid={`button-expand-maid-order-${order.id}`}>
                            {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {order.notes && <p className="text-sm text-muted-foreground mt-1">{order.notes}</p>}
                      {expandedOrder === order.id && (
                        <MaidOrderDetailPanel
                          orderId={order.id}
                          editable={order.status === "pending" && order.createdBy === user?.id}
                          currentScheduledFor={order.scheduledFor}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeOrders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">{t("household.activeOrders")}</h3>
                {activeOrders.map(order => (
                  <Card key={order.id} data-testid={`card-maid-active-order-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <Button size="icon" variant="ghost" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} data-testid={`button-expand-maid-active-${order.id}`}>
                            {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {expandedOrder === order.id && <MaidOrderDetailPanel orderId={order.id} />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {completedOrders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">{t("household.completedOrders")}</h3>
                {completedOrders.map(order => (
                  <Card key={order.id} data-testid={`card-maid-completed-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <Button size="icon" variant="ghost" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} data-testid={`button-expand-maid-completed-${order.id}`}>
                            {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {expandedOrder === order.id && <MaidOrderDetailPanel orderId={order.id} />}
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
        </TabsContent>

        {user?.canAddShortages && (
          <TabsContent value="shortages"><ShortagesSection /></TabsContent>
        )}
      </Tabs>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("maid.cart")} ({cart.reduce((s, i) => s + i.quantity, 0)})</DialogTitle></DialogHeader>
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{t("maid.emptyCart")}</p>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{productDisplayName(item.product)}</span>
                    <Badge className="no-default-hover-elevate no-default-active-elevate" variant="secondary">x{item.quantity}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (item.quantity <= 1) removeFromCart(item.productId);
                      else updateQuantity(item.productId, -1);
                    }} data-testid={`button-decrease-${item.productId}`}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => updateQuantity(item.productId, 1)} data-testid={`button-increase-${item.productId}`}>
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.productId)} data-testid={`button-remove-${item.productId}`}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <span className="font-bold">{t("fields.total")}: {cart.reduce((s, i) => s + i.quantity, 0)} {t("fields.items")}</span>
              </div>
              <Textarea placeholder={t("fields.notes")} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" data-testid="input-order-notes" />
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{t("schedule.deliverySchedule")}</span>
                <div className="flex gap-1">
                  {[
                    { value: "today", label: t("schedule.today"), icon: CalendarDays },
                    { value: "now", label: t("schedule.now"), icon: Zap },
                    { value: "tomorrow", label: t("schedule.tomorrow"), icon: Clock },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={scheduledFor === opt.value ? "default" : "outline"}
                      className="flex-1 gap-1"
                      onClick={() => setScheduledFor(opt.value)}
                      data-testid={`button-schedule-${opt.value}`}
                    >
                      <opt.icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button className="w-full gap-2" onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} data-testid="button-submit-order">
                <Send className="w-4 h-4" /> {t("maid.sendOrder")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateOrder} onOpenChange={(open) => { setShowUpdateOrder(open); if (!open) { setUpdateCart([]); setSelectedOrderForUpdate(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("maid.updateOrder")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {inProgressOrders.length > 0 && (
              <Select value={selectedOrderForUpdate} onValueChange={setSelectedOrderForUpdate}>
                <SelectTrigger data-testid="select-active-order"><SelectValue placeholder={t("maid.selectOrder")} /></SelectTrigger>
                <SelectContent>
                  {inProgressOrders.map(o => <SelectItem key={o.id} value={String(o.id)}>#{o.id}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {selectedOrderForUpdate && (
              <>
                <h4 className="text-sm font-medium">{t("maid.addToOrder")}</h4>
                <div className="grid grid-cols-3 gap-2 max-h-[30vh] overflow-y-auto">
                  {products?.map(product => {
                    const inUpdateCart = updateCart.find(i => i.productId === product.id);
                    const catData = categories?.find(c => c.id === product.categoryId);
                    const Icon = getIcon(catData?.icon || product.icon);
                    return (
                      <button key={product.id} onClick={() => addToUpdateCart(product)}
                        className={`relative flex flex-col items-center justify-center p-2 rounded-md border text-center transition-colors min-h-[70px] hover-elevate active-elevate-2 ${inUpdateCart ? "border-primary bg-primary/5" : "bg-card"}`}
                        data-testid={`button-update-add-${product.id}`}>
                        {product.imageUrl ? (
                          <div className="w-8 h-8 rounded-md overflow-hidden mb-1">
                            <img src={imgUrl(product.imageUrl)} alt={localName(product)} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <Icon className="w-6 h-6 mb-1 text-muted-foreground" />
                        )}
                        <span className="text-[10px] font-medium leading-tight">{productDisplayName(product)}</span>
                        {inUpdateCart && (
                          <span className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[9px]">
                            {inUpdateCart.quantity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {updateCart.length > 0 && (
                  <div className="space-y-2 border-t pt-2">
                    {updateCart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between gap-2">
                        <span className="text-sm">{productDisplayName(item.product)} x{item.quantity}</span>
                        <Button size="icon" variant="ghost" onClick={() => removeFromUpdateCart(item.productId)} data-testid={`button-update-remove-${item.productId}`}>
                          <X className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button className="w-full gap-2" onClick={() => addToActiveOrderMutation.mutate()} disabled={addToActiveOrderMutation.isPending} data-testid="button-submit-update">
                      <Plus className="w-4 h-4" /> {t("maid.addToOrder")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
