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
import { ClipboardList, Package, Users, Check, X, Plus, ShoppingCart, BarChart3, Pencil, Upload, Image as ImageIcon, Store as StoreIcon, ExternalLink, Ban, UserCheck } from "lucide-react";
import { useState, useRef } from "react";
import type { Order, Product, Category, Store } from "@shared/schema";
import { t, formatPrice } from "@/lib/i18n";
import { useLang } from "@/App";
import type { AuthUser } from "@/hooks/use-auth";

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

function StatsCards({ onStatClick }: { onStatClick: (filter: string | null) => void }) {
  useLang();
  const { data: stats, isLoading } = useQuery<{ pending: number; approved: number; inProgress: number; completed: number; total: number; totalSpent: number }>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
    </div>
  );

  const cards = [
    { label: t("stats.totalOrders"), sub: null, value: stats?.total || 0, icon: ClipboardList, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", filter: null },
    { label: t("stats.pendingOrders"), sub: null, value: stats?.pending || 0, icon: ShoppingCart, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30", filter: "pending" },
    { label: t("stats.completedOrders"), sub: t("stats.completedSub"), value: stats?.completed || 0, icon: Check, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", filter: "completed" },
    { label: t("stats.totalSpent"), sub: t("stats.spentSub"), value: formatPrice(stats?.totalSpent || 0), icon: BarChart3, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30", filter: "spent" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Card key={i} className="cursor-pointer hover-elevate active-elevate-2" onClick={() => onStatClick(c.filter)} data-testid={`card-stat-${i}`}>
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground leading-tight">{c.label}</span>
              {c.sub && <span className="text-[10px] text-muted-foreground leading-tight">{c.sub}</span>}
            </div>
            <span className="text-xl font-bold" data-testid={`text-stat-${i}`}>{c.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrdersTab({ statusFilter }: { statusFilter: string | null }) {
  useLang();
  const { toast } = useToast();
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });

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

  const filtered = statusFilter && statusFilter !== "spent"
    ? orders?.filter(o => o.status === statusFilter)
    : statusFilter === "spent"
    ? orders?.filter(o => o.status === "completed")
    : orders;

  if (!filtered?.length) return <p className="text-center text-muted-foreground py-8">{t("messages.noOrders")}</p>;

  return (
    <div className="space-y-3">
      {statusFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="no-default-hover-elevate no-default-active-elevate">{statusFilter === "spent" ? t("stats.totalSpent") : t(`status.${statusFilter}`)}</Badge>
          <span className="text-sm text-muted-foreground">({filtered.length})</span>
        </div>
      )}
      {filtered.map(order => (
        <Card key={order.id} data-testid={`card-order-${order.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <span className="font-medium">#{order.id}</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap text-sm text-muted-foreground">
              <span>{t("fields.estimatedPrice")}: {formatPrice(order.totalEstimated || 0)}</span>
              {order.totalActual ? <span>{t("fields.actualPrice")}: {formatPrice(order.totalActual)}</span> : null}
            </div>
            {order.receiptImageUrl && (
              <div className="mt-2">
                <a href={order.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                  {t("fields.receipt")} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {order.notes && <p className="text-sm text-muted-foreground mt-1">{order.notes}</p>}
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(order.createdAt!).toLocaleDateString("ar-SA")}
            </div>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductsTab() {
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
    setNameAr(""); setNameEn(""); setEstimatedPrice(""); setPreferredStore(""); setCategoryId(""); setStoreId(""); setUnit(""); setImageUrl("");
    setEditingProduct(null);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setNameAr(p.nameAr);
    setNameEn(p.nameEn || "");
    setEstimatedPrice(String(p.estimatedPrice || ""));
    setPreferredStore(p.preferredStore || "");
    setCategoryId(p.categoryId ? String(p.categoryId) : "");
    setStoreId(p.storeId ? String(p.storeId) : "");
    setUnit(p.unit || "");
    setImageUrl(p.imageUrl || "");
    setShowAdd(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (res.ok) setImageUrl(data.imageUrl);
    } catch {}
    setUploading(false);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/products", data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowAdd(false); resetForm();
      toast({ title: t("messages.productAdded") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/products/${id}`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowAdd(false); resetForm();
      toast({ title: t("messages.productUpdated") });
    },
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
      unit: unit || null,
      imageUrl: imageUrl || null,
    };
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data });
    else createMutation.mutate(data);
  };

  const getStoreName = (sid: number | null) => {
    if (!sid) return "";
    const s = allStores?.find(st => st.id === sid);
    return s?.nameAr || "";
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
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {allStores && allStores.length > 0 && (
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger data-testid="select-product-store"><SelectValue placeholder={t("fields.preferredStore")} /></SelectTrigger>
                <SelectContent>
                  {allStores.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.nameAr}</SelectItem>)}
                </SelectContent>
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
                    <img src={p.imageUrl} alt={p.nameAr} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <span className="font-medium">{p.nameAr}</span>
                  {p.nameEn && <span className="text-sm text-muted-foreground mr-2"> ({p.nameEn})</span>}
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

function CategoriesTab() {
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
              <span className="font-medium">{c.nameAr} {c.nameEn ? `(${c.nameEn})` : ""}</span>
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

function StoresTab() {
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
                  <span className="font-medium">{s.nameAr}</span>
                  {s.nameEn && <span className="text-sm text-muted-foreground">({s.nameEn})</span>}
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

function UsersTab() {
  useLang();
  const { toast } = useToast();
  const { data: allUsers, isLoading } = useQuery<AuthUser[]>({ queryKey: ["/api/users"] });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role, canApprove }: { id: string; role: string; canApprove: boolean }) => {
      await apiRequest("PATCH", `/api/users/${id}/role`, { role, canApprove });
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

export default function AdminDashboard() {
  useLang();
  const [activeTab, setActiveTab] = useState("orders");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const handleStatClick = (filter: string | null) => {
    setStatusFilter(filter);
    setActiveTab("orders");
  };

  return (
    <div className="space-y-4">
      <StatsCards onStatClick={handleStatClick} />
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== "orders") setStatusFilter(null); }}>
        <TabsList className="w-full justify-start gap-1 flex-wrap">
          <TabsTrigger value="orders" className="gap-1" data-testid="tab-orders">
            <ClipboardList className="w-4 h-4" /> {t("nav.orders")}
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1" data-testid="tab-products">
            <Package className="w-4 h-4" /> {t("nav.products")}
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1" data-testid="tab-categories">
            {t("nav.categories")}
          </TabsTrigger>
          <TabsTrigger value="stores" className="gap-1" data-testid="tab-stores">
            <StoreIcon className="w-4 h-4" /> {t("nav.stores")}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1" data-testid="tab-users">
            <Users className="w-4 h-4" /> {t("nav.users")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersTab statusFilter={statusFilter} /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="stores"><StoresTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
