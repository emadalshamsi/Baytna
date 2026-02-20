import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Package, Check, X, Plus, Minus, ShoppingCart, Pencil, Upload, Image as ImageIcon, Store as StoreIcon, ExternalLink, LayoutGrid, ChevronDown, ChevronUp, User, AlertTriangle, Trash2, UtensilsCrossed, Copy } from "lucide-react";
import { useState, useRef } from "react";
import type { Order, Product, Category, Store, OrderItem, User as UserType, Shortage } from "@shared/schema";
import { t, formatPrice, displayName, formatDate, getLang, imgUrl, localName, productDisplayName } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/App";
import { MealItemsSection } from "@/pages/housekeeping";

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
    <Badge className={`no-default-hover-elevate no-default-active-elevate ${variants[status] || ""}`} data-testid={`badge-status-${status}`}>
      {t(`status.${status}`)}
    </Badge>
  );
}

function OrderDetailPanel({ orderId, editable = false }: { orderId: number; editable?: boolean }) {
  useLang();
  const { toast } = useToast();
  const { data: items, isLoading } = useQuery<OrderItem[]>({ queryKey: ["/api/orders", orderId, "items"], queryFn: () => fetch(`/api/orders/${orderId}/items`, { credentials: "include" }).then(r => r.json()) });
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
      toast({ title: t("household.itemUpdated") });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/order-items/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: t("household.itemRemoved") });
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
      toast({ title: t("household.itemAddedToOrder") });
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
    <div className="mt-3 border-t pt-3 space-y-2" data-testid={`order-items-panel-${orderId}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground">{t("fields.orderItems")} ({items?.length || 0})</span>
        {editable && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddItem(!showAddItem)} data-testid={`button-add-item-to-order-${orderId}`}>
            <Plus className="w-3 h-3" /> {t("household.addItemToOrder")}
          </Button>
        )}
      </div>

      {editable && showAddItem && (
        <div className="p-3 rounded-md bg-muted/50 space-y-2" data-testid={`add-item-panel-${orderId}`}>
          <Input
            placeholder={t("actions.search")}
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            className="text-sm"
            data-testid={`input-search-product-${orderId}`}
          />
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger data-testid={`select-product-for-order-${orderId}`}>
              <SelectValue placeholder={t("admin.addProduct")} />
            </SelectTrigger>
            <SelectContent>
              {filteredAvailable.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {productDisplayName(p)} {p.estimatedPrice ? `- ${formatPrice(p.estimatedPrice)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="number"
              min="1"
              value={addQuantity}
              onChange={e => setAddQuantity(e.target.value)}
              className="w-20 text-sm"
              data-testid={`input-add-quantity-${orderId}`}
            />
            <Button size="sm" onClick={handleAddItem} disabled={!selectedProductId || addItemMutation.isPending} data-testid={`button-confirm-add-item-${orderId}`}>
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
            <div key={item.id} className="flex items-center justify-between gap-2 flex-wrap text-sm py-1.5 border-b last:border-b-0" data-testid={`order-item-${item.id}`}>
              <div className="flex items-center gap-2 min-w-0">
                {product?.imageUrl && <img src={imgUrl(product.imageUrl)} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                <div className="min-w-0">
                  <span className="font-medium text-sm truncate block text-start">{product ? productDisplayName(product) : `#${item.productId}`}</span>
                  <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.actualPrice != null ? (
                  <span className="text-xs">{formatPrice(item.actualPrice)}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{formatPrice(item.estimatedPrice || 0)}</span>
                )}
                {item.isPurchased && (
                  <Badge className="no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                    <Check className="w-3 h-3" />
                  </Badge>
                )}
                {editable && !item.isPurchased && (
                  <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (item.quantity > 1) {
                        updateItemMutation.mutate({ id: item.id, data: { quantity: item.quantity - 1 } });
                      }
                    }} disabled={item.quantity <= 1 || updateItemMutation.isPending} data-testid={`button-decrease-item-${item.id}`}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      updateItemMutation.mutate({ id: item.id, data: { quantity: item.quantity + 1 } });
                    }} disabled={updateItemMutation.isPending} data-testid={`button-increase-item-${item.id}`}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      deleteItemMutation.mutate(item.id);
                    }} disabled={deleteItemMutation.isPending} data-testid={`button-delete-item-${item.id}`}>
                      <X className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function OrdersSection() {
  useLang();
  const { toast } = useToast();
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: users } = useQuery<UserType[]>({ queryKey: ["/api/users"] });
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const userMap = new Map((users || []).map(u => [u.id, u]));

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: t("admin.orderStatusUpdated") });
    },
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  if (!orders?.length) return <p className="text-center text-muted-foreground py-8">{t("messages.noOrders")}</p>;

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const isExpanded = expandedOrder === order.id;
        const creator = userMap.get(order.createdBy);
        const approver = order.approvedBy ? userMap.get(order.approvedBy) : null;
        return (
          <Card key={order.id} data-testid={`card-order-${order.id}`}>
            <CardContent className="p-4">
              <div
                className="cursor-pointer"
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                data-testid={`button-toggle-order-${order.id}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">#{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap text-sm text-muted-foreground">
                  <span>{t("fields.estimatedPrice")}: {formatPrice(order.totalEstimated || 0)}</span>
                  {order.totalActual ? <span>{t("fields.actualPrice")}: {formatPrice(order.totalActual)}</span> : null}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1">
                  {creator && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {t("fields.createdBy")}: {displayName(creator)}
                    </span>
                  )}
                  <span className="text-foreground/80 font-medium">{formatDate(order.createdAt!)}</span>
                </div>
                {approver && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("fields.approvedByField")}: {displayName(approver)}
                  </div>
                )}
              </div>

              {order.receiptImageUrl && (
                <div className="mt-2">
                  <a href={order.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                    {t("fields.receipt")} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {order.notes && <p className="text-sm text-muted-foreground mt-1">{order.notes}</p>}

              {order.status === "pending" && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: order.id, status: "approved" })} disabled={statusMutation.isPending} data-testid={`button-approve-${order.id}`}>
                    <Check className="w-4 h-4 ml-1" /> {t("actions.approve")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: order.id, status: "rejected" })} disabled={statusMutation.isPending} data-testid={`button-reject-${order.id}`}>
                    <X className="w-4 h-4 ml-1" /> {t("actions.reject")}
                  </Button>
                </div>
              )}

              {isExpanded && <OrderDetailPanel orderId={order.id} editable={order.status === "pending" || order.status === "approved"} />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ProductsSection() {
  useLang();
  const { toast } = useToast();
  const { data: products, isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: allStores } = useQuery<Store[]>({ queryKey: ["/api/stores"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [preferredStore, setPreferredStore] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [unitAr, setUnitAr] = useState("");
  const [unitEn, setUnitEn] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setNameAr(""); setNameEn(""); setEstimatedPrice(""); setPreferredStore(""); setCategoryId(""); setStoreId(""); setUnitAr(""); setUnitEn(""); setImageUrl("");
    setEditingProduct(null);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setNameAr(p.nameAr); setNameEn(p.nameEn || ""); setEstimatedPrice(String(p.estimatedPrice || ""));
    setPreferredStore(p.preferredStore || ""); setCategoryId(p.categoryId ? String(p.categoryId) : "");
    setStoreId(p.storeId ? String(p.storeId) : ""); setUnitAr(p.unitAr || p.unit || ""); setUnitEn(p.unitEn || ""); setImageUrl(p.imageUrl || "");
    setShowAdd(true);
  };

  const openDuplicate = (p: Product) => {
    setEditingProduct(null);
    setNameAr(p.nameAr); setNameEn(p.nameEn || ""); setEstimatedPrice(String(p.estimatedPrice || ""));
    setPreferredStore(p.preferredStore || ""); setCategoryId(p.categoryId ? String(p.categoryId) : "");
    setStoreId(p.storeId ? String(p.storeId) : ""); setUnitAr(p.unitAr || p.unit || ""); setUnitEn(p.unitEn || ""); setImageUrl(p.imageUrl || "");
    setShowAdd(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (res.ok) setImageUrl(data.imageUrl);
    } catch {}
    setUploading(false);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/products", data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setShowAdd(false); resetForm(); toast({ title: t("messages.productAdded") }); },
    onError: (error: any) => { toast({ title: t("messages.error"), description: error?.message || "Failed to create product", variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/products/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setShowAdd(false); resetForm(); toast({ title: t("messages.productUpdated") }); },
    onError: (error: any) => { toast({ title: t("messages.error"), description: error?.message || "Failed to update product", variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/products/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); },
  });

  const handleSave = () => {
    const data = {
      nameAr, nameEn: nameEn || null,
      estimatedPrice: estimatedPrice ? parseFloat(parseFloat(estimatedPrice).toFixed(2)) : 0,
      preferredStore: preferredStore || null,
      categoryId: categoryId ? parseInt(categoryId) : null,
      storeId: storeId ? parseInt(storeId) : null,
      unit: unitAr || unitEn || null, unitAr: unitAr || null, unitEn: unitEn || null, imageUrl: imageUrl || null,
    };
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data });
    else createMutation.mutate(data);
  };

  const getStoreName = (sid: number | null) => {
    if (!sid) return "";
    const s = allStores?.find(st => st.id === sid);
    return s ? localName(s) : "";
  };

  const searchedProducts = products?.filter(p => {
    if (!productSearchQuery) return true;
    const q = productSearchQuery.toLowerCase();
    return p.nameAr.includes(productSearchQuery) || p.nameAr.toLowerCase().includes(q) || (p.nameEn && p.nameEn.toLowerCase().includes(q));
  })?.sort((a, b) => {
    const lang = getLang();
    const nameA = lang === "ar" ? (a.nameAr || "") : (a.nameEn || a.nameAr || "");
    const nameB = lang === "ar" ? (b.nameAr || "") : (b.nameEn || b.nameAr || "");
    return nameA.localeCompare(nameB, lang === "ar" ? "ar" : "en");
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-product"><Plus className="w-4 h-4" /> {t("admin.addProduct")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct ? t("admin.editProduct") : t("admin.addProduct")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("fields.nameAr")} value={nameAr} onChange={e => setNameAr(e.target.value)} data-testid="input-product-name-ar" />
            <Input placeholder={t("fields.nameEn")} value={nameEn} onChange={e => setNameEn(e.target.value)} data-testid="input-product-name-en" dir="ltr" />
            <Input type="number" step="0.01" placeholder={t("fields.estimatedPrice")} value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} data-testid="input-product-price" />
            <div className="flex gap-2">
              <Input placeholder={t("fields.unit")} value={unitAr} onChange={e => setUnitAr(e.target.value)} data-testid="input-product-unit-ar" className="flex-1" />
              <Input placeholder="Unit" value={unitEn} onChange={e => setUnitEn(e.target.value)} data-testid="input-product-unit-en" dir="ltr" className="flex-1" />
            </div>
            {categories && categories.length > 0 && (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger data-testid="select-product-category"><SelectValue placeholder={t("fields.category")} /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{localName(c)}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {allStores && allStores.length > 0 && (
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger data-testid="select-product-store"><SelectValue placeholder={t("fields.preferredStore")} /></SelectTrigger>
                <SelectContent>{allStores.map(s => <SelectItem key={s.id} value={String(s.id)}>{localName(s)}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload-image">
                <Upload className="w-4 h-4" /> {uploading ? t("auth.loading") : t("fields.uploadImage")}
              </Button>
              {imageUrl && (
                <div className="relative w-full rounded-md overflow-hidden bg-muted" style={{ height: "25vh" }}>
                  <img src={imageUrl} alt="" className="w-full h-full object-contain" />
                  <Button size="icon" variant="ghost" className="absolute top-1 left-1 bg-background/80" onClick={() => setImageUrl("")} data-testid="button-remove-image">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <Button className="w-full" disabled={!nameAr || createMutation.isPending || updateMutation.isPending} data-testid="button-save-product" onClick={handleSave}>
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Input
        placeholder={t("actions.searchProducts")}
        value={productSearchQuery}
        onChange={e => setProductSearchQuery(e.target.value)}
        className="text-sm"
        data-testid="input-search-products-admin"
      />

      {!searchedProducts?.length ? (
        <p className="text-center text-muted-foreground py-8">{t("messages.noProducts")}</p>
      ) : (
        searchedProducts.map(p => (
          <Card key={p.id} data-testid={`card-product-${p.id}`}>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {p.imageUrl ? (
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img src={imgUrl(p.imageUrl)} alt={localName(p)} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-medium truncate block text-start">{productDisplayName(p)}</span>
                  <div className="text-sm text-muted-foreground text-start truncate">
                    {p.estimatedPrice ? formatPrice(p.estimatedPrice) : ""}
                    {p.storeId ? ` - ${getStoreName(p.storeId)}` : p.preferredStore ? ` - ${p.preferredStore}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openDuplicate(p)} data-testid={`button-duplicate-product-${p.id}`}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)} data-testid={`button-edit-product-${p.id}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-product-${p.id}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function CategoriesSection() {
  useLang();
  const { toast } = useToast();
  const { data: categories, isLoading } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [icon, setIcon] = useState("");

  const resetForm = () => { setNameAr(""); setNameEn(""); setIcon(""); setEditingCategory(null); };

  const openEdit = (c: Category) => {
    setEditingCategory(c); setNameAr(c.nameAr); setNameEn(c.nameEn || ""); setIcon(c.icon || ""); setShowAdd(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/categories", data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setShowAdd(false); resetForm(); toast({ title: t("admin.categoryAdded") }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/categories/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setShowAdd(false); resetForm(); toast({ title: t("messages.categoryUpdated") }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/categories/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); },
  });

  const handleSave = () => {
    const data = { nameAr, nameEn: nameEn || null, icon: icon || null };
    if (editingCategory) updateMutation.mutate({ id: editingCategory.id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-category"><Plus className="w-4 h-4" /> {t("admin.addCategory")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCategory ? t("admin.editCategory") : t("admin.addCategory")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("fields.nameAr")} value={nameAr} onChange={e => setNameAr(e.target.value)} data-testid="input-category-name-ar" />
            <Input placeholder={t("fields.nameEn")} value={nameEn} onChange={e => setNameEn(e.target.value)} data-testid="input-category-name-en" dir="ltr" />
            <Input placeholder={t("admin.iconCode")} value={icon} onChange={e => setIcon(e.target.value)} data-testid="input-category-icon" />
            <Button className="w-full" disabled={!nameAr || createMutation.isPending || updateMutation.isPending} data-testid="button-save-category" onClick={handleSave}>
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!categories?.length ? (
        <p className="text-center text-muted-foreground py-8">{t("messages.noCategories")}</p>
      ) : (
        categories.map(c => (
          <Card key={c.id} data-testid={`card-category-${c.id}`}>
            <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium">{localName(c)}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)} data-testid={`button-edit-category-${c.id}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)} data-testid={`button-delete-category-${c.id}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function StoresSection() {
  useLang();
  const { toast } = useToast();
  const { data: allStores, isLoading } = useQuery<Store[]>({ queryKey: ["/api/stores"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const resetForm = () => { setNameAr(""); setNameEn(""); setWebsiteUrl(""); setEditingStore(null); };

  const openEdit = (s: Store) => {
    setEditingStore(s); setNameAr(s.nameAr); setNameEn(s.nameEn || ""); setWebsiteUrl(s.websiteUrl || ""); setShowAdd(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/stores", data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/stores"] }); setShowAdd(false); resetForm(); toast({ title: t("admin.storeAdded") }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/stores/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/stores"] }); setShowAdd(false); resetForm(); toast({ title: t("admin.storeUpdated") }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/stores/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/stores"] }); },
  });

  const handleSave = () => {
    const data = { nameAr, nameEn: nameEn || null, websiteUrl: websiteUrl || null };
    if (editingStore) updateMutation.mutate({ id: editingStore.id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-store"><Plus className="w-4 h-4" /> {t("admin.addStore")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStore ? t("admin.editStore") : t("admin.addStore")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("fields.nameAr")} value={nameAr} onChange={e => setNameAr(e.target.value)} data-testid="input-store-name-ar" />
            <Input placeholder={t("fields.nameEn")} value={nameEn} onChange={e => setNameEn(e.target.value)} data-testid="input-store-name-en" dir="ltr" />
            <Input placeholder={t("fields.websiteUrl")} value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} data-testid="input-store-url" dir="ltr" />
            <Button className="w-full" disabled={!nameAr || createMutation.isPending || updateMutation.isPending} data-testid="button-save-store" onClick={handleSave}>
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!allStores?.length ? (
        <p className="text-center text-muted-foreground py-8">{t("messages.noStores")}</p>
      ) : (
        allStores.map(s => (
          <Card key={s.id} data-testid={`card-store-${s.id}`}>
            <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <StoreIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{localName(s)}</span>
                </div>
                {s.websiteUrl && (
                  <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1 mt-1" data-testid={`link-store-url-${s.id}`}>
                    {s.websiteUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(s)} data-testid={`button-edit-store-${s.id}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)} data-testid={`button-delete-store-${s.id}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export function ShortagesSection({ isAdmin = false }: { isAdmin?: boolean }) {
  useLang();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: shortages, isLoading } = useQuery<Shortage[]>({ queryKey: ["/api/shortages"] });
  const { data: users } = useQuery<UserType[]>({ queryKey: ["/api/users"], enabled: isAdmin });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [shortageNotes, setShortageNotes] = useState("");

  const userMap = new Map((users || []).map(u => [u.id, u]));

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/shortages", { nameAr, nameEn: nameEn || undefined, quantity, notes: shortageNotes || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shortages"] });
      setShowAddDialog(false);
      setNameAr(""); setNameEn(""); setQuantity(1); setShortageNotes("");
      toast({ title: t("shortages.shortageAdded") });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/shortages/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shortages"] });
      toast({ title: t("shortages.statusUpdated") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shortages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shortages"] });
      toast({ title: t("shortages.shortageDeleted") });
    },
  });

  const canAdd = user?.role === "admin" || user?.canAddShortages;

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      {canAdd && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2" data-testid="button-add-shortage">
              <Plus className="w-4 h-4" /> {t("shortages.addShortage")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("shortages.addShortage")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder={t("shortages.nameAr")} value={nameAr} onChange={e => setNameAr(e.target.value)} data-testid="input-shortage-name-ar" />
              <Input placeholder={t("shortages.nameEn")} value={nameEn} onChange={e => setNameEn(e.target.value)} data-testid="input-shortage-name-en" />
              <Input type="number" min={1} placeholder={t("shortages.quantity")} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} data-testid="input-shortage-quantity" />
              <Textarea placeholder={t("shortages.notes")} value={shortageNotes} onChange={e => setShortageNotes(e.target.value)} data-testid="input-shortage-notes" />
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!nameAr.trim() || createMutation.isPending} data-testid="button-submit-shortage">
                {t("actions.submit")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {!shortages?.length ? (
        <p className="text-center text-muted-foreground py-8" data-testid="text-no-shortages">{t("shortages.noShortages")}</p>
      ) : (
        shortages.map(s => (
          <Card key={s.id} data-testid={`card-shortage-${s.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium" data-testid={`text-shortage-name-${s.id}`}>{localName(s)}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span>{t("shortages.quantity")}: {s.quantity}</span>
                    {isAdmin && s.createdBy && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {userMap.get(s.createdBy) ? displayName(userMap.get(s.createdBy)!) : "?"}
                      </span>
                    )}
                  </div>
                  {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t flex-wrap">
                  {s.status === "pending" && (
                    <>
                      <Button size="sm" variant="default" className="gap-1" onClick={() => statusMutation.mutate({ id: s.id, status: "approved" })} disabled={statusMutation.isPending} data-testid={`button-approve-shortage-${s.id}`}>
                        <Check className="w-3 h-3" /> {t("actions.approve")}
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => statusMutation.mutate({ id: s.id, status: "rejected" })} disabled={statusMutation.isPending} data-testid={`button-reject-shortage-${s.id}`}>
                        <X className="w-3 h-3" /> {t("actions.reject")}
                      </Button>
                    </>
                  )}
                  {s.status === "approved" && (
                    <Button size="sm" variant="default" className="gap-1" onClick={() => statusMutation.mutate({ id: s.id, status: "in_progress" })} disabled={statusMutation.isPending} data-testid={`button-start-shortage-${s.id}`}>
                      {t("status.in_progress")}
                    </Button>
                  )}
                  {s.status === "in_progress" && (
                    <Button size="sm" variant="default" className="gap-1" onClick={() => statusMutation.mutate({ id: s.id, status: "completed" })} disabled={statusMutation.isPending} data-testid={`button-complete-shortage-${s.id}`}>
                      <Check className="w-3 h-3" /> {t("status.completed")}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-shortage-${s.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function AdminShopping() {
  useLang();
  const [activeTab, setActiveTab] = useState("orders");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-shopping-title">
        <ShoppingCart className="w-5 h-5 text-primary" />
        {t("nav.shoppingSection")}
      </h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start gap-1 flex-nowrap overflow-x-auto">
          <TabsTrigger value="orders" className="gap-1 shrink-0" data-testid="tab-orders">
            <ClipboardList className="w-4 h-4" /> {t("nav.orders")}
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1 shrink-0" data-testid="tab-products">
            <Package className="w-4 h-4" /> {t("nav.products")}
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1 shrink-0" data-testid="tab-categories">
            <LayoutGrid className="w-4 h-4" /> {t("nav.categories")}
          </TabsTrigger>
          <TabsTrigger value="stores" className="gap-1 shrink-0" data-testid="tab-stores">
            <StoreIcon className="w-4 h-4" /> {t("nav.stores")}
          </TabsTrigger>
          <TabsTrigger value="shortages" className="gap-1 shrink-0" data-testid="tab-shortages">
            <AlertTriangle className="w-4 h-4" /> {t("shortages.title")}
          </TabsTrigger>
          <TabsTrigger value="meals" className="gap-1 shrink-0" data-testid="tab-meals">
            <UtensilsCrossed className="w-4 h-4" /> {t("housekeepingSection.mealCatalog")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersSection /></TabsContent>
        <TabsContent value="products"><ProductsSection /></TabsContent>
        <TabsContent value="categories"><CategoriesSection /></TabsContent>
        <TabsContent value="stores"><StoresSection /></TabsContent>
        <TabsContent value="shortages"><ShortagesSection isAdmin={true} /></TabsContent>
        <TabsContent value="meals"><MealItemsSection lang={getLang()} /></TabsContent>
      </Tabs>
    </div>
  );
}
