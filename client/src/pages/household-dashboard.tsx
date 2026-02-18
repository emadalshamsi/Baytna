import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart, Milk, Apple, Beef, Fish, Egg, Cookie, Coffee,
  Droplets, Sparkles, Shirt, Pill, Baby, Sandwich, IceCream, Wheat,
  CircleDot, CupSoda, Citrus, Carrot, Cherry, Grape, Banana, Nut,
  Send, Package, Plus, Minus, X, Check, ClipboardList,
  Image as ImageIcon, RefreshCw, Upload, Pencil, LayoutGrid,
  Store as StoreIcon, ExternalLink, AlertTriangle, ChevronDown, ChevronUp,
  Clock, CalendarDays, Zap, ChefHat
} from "lucide-react";
import { useState, useRef } from "react";
import type { Product, Category, Order, Store, OrderItem, Shortage } from "@shared/schema";
import { t, formatPrice, getLang, imgUrl, localName } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/App";
import { ShortagesSection } from "@/pages/admin-shopping";
import { KitchenTab, MealItemsSection } from "@/pages/housekeeping";

const categoryIcons: Record<string, any> = {
  milk: Milk, dairy: Milk, apple: Apple, fruit: Apple, fruits: Apple,
  meat: Beef, fish: Fish, egg: Egg, eggs: Egg, cookie: Cookie, cookies: Cookie,
  coffee: Coffee, water: Droplets, cleaning: Sparkles, clothes: Shirt,
  medicine: Pill, baby: Baby, bread: Sandwich, bakery: Sandwich,
  icecream: IceCream, wheat: Wheat, drinks: CupSoda, citrus: Citrus,
  vegetables: Carrot, carrot: Carrot, cherry: Cherry, grape: Grape,
  banana: Banana, nuts: Nut,
};

function getIcon(iconName?: string | null) {
  if (!iconName) return Package;
  return categoryIcons[iconName.toLowerCase()] || CircleDot;
}

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

function OrderDetailPanel({ orderId, editable = false, currentScheduledFor }: { orderId: number; editable?: boolean; currentScheduledFor?: string | null }) {
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

  const getScheduleLabel = (sf: string | null | undefined) => {
    if (!sf) return t("schedule.today");
    const today = new Date().toISOString().split("T")[0];
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tomorrow = tmr.toISOString().split("T")[0];
    if (sf === today) return t("schedule.today");
    if (sf === tomorrow) return t("schedule.tomorrow");
    return sf;
  };

  const scheduleMutation = useMutation({
    mutationFn: async (scheduledFor: string) => {
      await apiRequest("PATCH", `/api/orders/${orderId}/scheduled`, { scheduledFor });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: t("schedule.scheduleUpdated") });
    },
  });

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
                  {localName(p)} {p.estimatedPrice ? `- ${formatPrice(p.estimatedPrice)}` : ""}
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
                  <span className="font-medium text-sm truncate block">{product ? localName(product) : `#${item.productId}`}</span>
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

      {editable && (
        <div className="pt-2 border-t space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t("schedule.deliverySchedule")}: {getScheduleLabel(currentScheduledFor)}</span>
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
                  data-testid={`button-edit-schedule-${opt.value}-${orderId}`}
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

function ManageProductsSection() {
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
  const [unit, setUnit] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setNameAr(""); setNameEn(""); setEstimatedPrice(""); setPreferredStore("");
    setCategoryId(""); setStoreId(""); setUnit(""); setImageUrl(""); setEditingProduct(null);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p); setNameAr(p.nameAr); setNameEn(p.nameEn || "");
    setEstimatedPrice(p.estimatedPrice ? String(p.estimatedPrice) : "");
    setPreferredStore(p.preferredStore || ""); setCategoryId(p.categoryId ? String(p.categoryId) : "");
    setStoreId(p.storeId ? String(p.storeId) : ""); setUnit(p.unit || ""); setImageUrl(p.imageUrl || "");
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
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/products/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setShowAdd(false); resetForm(); toast({ title: t("messages.productUpdated") }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/products/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); },
  });

  const handleSave = () => {
    const data = {
      nameAr, nameEn: nameEn || null,
      estimatedPrice: estimatedPrice ? parseInt(estimatedPrice) : 0,
      preferredStore: preferredStore || null,
      categoryId: categoryId ? parseInt(categoryId) : null,
      storeId: storeId ? parseInt(storeId) : null,
      unit: unit || null, imageUrl: imageUrl || null,
    };
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data });
    else createMutation.mutate(data);
  };

  const getStoreName = (sid: number | null) => {
    if (!sid) return "";
    const s = allStores?.find(st => st.id === sid);
    return s ? localName(s) : "";
  };

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
            <Input type="number" placeholder={t("fields.estimatedPrice")} value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} data-testid="input-product-price" />
            <Input placeholder={t("fields.unit")} value={unit} onChange={e => setUnit(e.target.value)} data-testid="input-product-unit" />
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
                <div className="relative w-full h-32 rounded-md overflow-hidden bg-muted">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
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

      {!products?.length ? (
        <p className="text-center text-muted-foreground py-8">{t("messages.noProducts")}</p>
      ) : (
        products.map(p => (
          <Card key={p.id} data-testid={`card-product-${p.id}`}>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {p.imageUrl ? (
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img src={imgUrl(p.imageUrl)} alt={localName(p)} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <span className="font-medium">{localName(p)}</span>
                  <div className="text-sm text-muted-foreground">
                    {p.estimatedPrice ? formatPrice(p.estimatedPrice) : ""}
                    {p.storeId ? ` - ${getStoreName(p.storeId)}` : p.preferredStore ? ` - ${p.preferredStore}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
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

function ManageCategoriesSection() {
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

function ManageStoresSection() {
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

export default function HouseholdDashboard() {
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
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("shopping");
  const [scheduledFor, setScheduledFor] = useState<string>("today");

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

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: t("admin.orderStatusUpdated") });
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

  const filteredProducts = selectedCategory !== null
    ? products?.filter(p => p.categoryId === selectedCategory)
    : products;

  const pendingOrders = orders?.filter(o => o.status === "pending") || [];
  const activeOrders = orders?.filter(o => o.status === "approved" || o.status === "in_progress") || [];
  const completedOrders = orders?.filter(o => o.status === "completed") || [];

  const canManage = user?.canApprove;

  const tabItems = [
    { value: "shopping", icon: ShoppingCart, label: t("nav.addItems") },
    { value: "orders", icon: ClipboardList, label: t("nav.orders") },
  ];

  if (canManage) {
    tabItems.push(
      { value: "products", icon: Package, label: t("nav.products") },
      { value: "categories", icon: LayoutGrid, label: t("nav.categories") },
      { value: "stores", icon: StoreIcon, label: t("nav.stores") },
    );
  }

  if (user?.canAddShortages && !user?.canApprove) {
    tabItems.push({ value: "shortages", icon: AlertTriangle, label: t("shortages.title") });
  }

  if (user?.canApprove) {
    tabItems.push({ value: "meals", icon: ChefHat, label: t("housekeepingSection.mealCatalog") });
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
              <Button className="gap-2 relative" onClick={() => setShowCart(true)} data-testid="button-view-cart">
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </Button>
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
                        <span className="text-xs font-medium leading-tight">{localName(product)}</span>
                        {product.estimatedPrice ? (
                          <span className="text-[10px] text-muted-foreground mt-0.5">{formatPrice(product.estimatedPrice)}</span>
                        ) : null}
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
                  <span className="text-xl font-bold block">{pendingOrders.length}</span>
                  <span className="text-xs text-muted-foreground">{t("household.pendingLabel")}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <ClipboardList className="w-5 h-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                  <span className="text-xl font-bold block">{activeOrders.length}</span>
                  <span className="text-xs text-muted-foreground">{t("household.activeLabel")}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Check className="w-5 h-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
                  <span className="text-xl font-bold block">{completedOrders.length}</span>
                  <span className="text-xs text-muted-foreground">{t("household.completedLabel")}</span>
                </CardContent>
              </Card>
            </div>

            {pendingOrders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">
                  {user?.canApprove ? t("household.needsApproval") : t("household.pendingOrders")}
                </h3>
                {pendingOrders.map(order => (
                  <Card key={order.id} data-testid={`card-household-order-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.id}</span>
                          <span className="text-sm text-muted-foreground">{formatPrice(order.totalEstimated || 0)}</span>
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
                          <Button size="icon" variant="ghost" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} data-testid={`button-expand-order-${order.id}`}>
                            {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {order.notes && <p className="text-sm text-muted-foreground mt-1">{order.notes}</p>}
                      {user?.canApprove && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          <Button size="sm" onClick={() => statusMutation.mutate({ id: order.id, status: "approved" })} disabled={statusMutation.isPending} data-testid={`button-approve-${order.id}`}>
                            <Check className="w-4 h-4 ml-1" /> {t("actions.approve")}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: order.id, status: "rejected" })} disabled={statusMutation.isPending} data-testid={`button-reject-${order.id}`}>
                            <X className="w-4 h-4 ml-1" /> {t("actions.reject")}
                          </Button>
                        </div>
                      )}
                      {expandedOrder === order.id && <OrderDetailPanel orderId={order.id} editable={(!!user?.canApprove || order.createdBy === user?.id) && order.status === "pending"} currentScheduledFor={order.scheduledFor} />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeOrders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">{t("household.activeOrders")}</h3>
                {activeOrders.map(order => (
                  <Card key={order.id} data-testid={`card-household-active-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.id}</span>
                          <span className="text-sm text-muted-foreground">{formatPrice(order.totalEstimated || 0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <Button size="icon" variant="ghost" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} data-testid={`button-expand-order-${order.id}`}>
                            {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {expandedOrder === order.id && <OrderDetailPanel orderId={order.id} />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {completedOrders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">{t("household.completedOrders")}</h3>
                {completedOrders.slice(0, 5).map(order => (
                  <Card key={order.id} data-testid={`card-household-completed-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.id}</span>
                          <span className="text-sm text-muted-foreground">
                            {order.totalActual ? formatPrice(order.totalActual) : formatPrice(order.totalEstimated || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <Button size="icon" variant="ghost" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} data-testid={`button-expand-order-${order.id}`}>
                            {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {expandedOrder === order.id && <OrderDetailPanel orderId={order.id} />}
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

        {canManage && (
          <>
            <TabsContent value="products"><ManageProductsSection /></TabsContent>
            <TabsContent value="categories"><ManageCategoriesSection /></TabsContent>
            <TabsContent value="stores"><ManageStoresSection /></TabsContent>
          </>
        )}

        {user?.canAddShortages && (
          <TabsContent value="shortages"><ShortagesSection /></TabsContent>
        )}

        {user?.canApprove && (
          <TabsContent value="meals"><MealItemsSection lang={getLang()} /></TabsContent>
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
                    <span className="font-medium text-sm">{localName(item.product)}</span>
                    <Badge className="no-default-hover-elevate no-default-active-elevate" variant="secondary">x{item.quantity}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{formatPrice((item.product.estimatedPrice || 0) * item.quantity)}</span>
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
                <span className="font-bold">{t("fields.total")}: {formatPrice(cart.reduce((s, i) => s + (i.product.estimatedPrice || 0) * i.quantity, 0))}</span>
                <span className="text-sm text-muted-foreground">{cart.reduce((s, i) => s + i.quantity, 0)} {t("fields.items")}</span>
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
    </div>
  );
}