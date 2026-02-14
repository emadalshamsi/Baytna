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
import { ClipboardList, Package, Users, Check, X, Plus, ShoppingCart, BarChart3 } from "lucide-react";
import { useState } from "react";
import type { Order, Product, Category } from "@shared/schema";
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

function StatsCards() {
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
    { label: t("stats.totalOrders"), value: stats?.total || 0, icon: ClipboardList, color: "text-blue-600 dark:text-blue-400" },
    { label: t("stats.pendingOrders"), value: stats?.pending || 0, icon: ShoppingCart, color: "text-amber-600 dark:text-amber-400" },
    { label: t("stats.completedOrders"), value: stats?.completed || 0, icon: Check, color: "text-green-600 dark:text-green-400" },
    { label: t("stats.totalSpent"), value: formatPrice(stats?.totalSpent || 0), icon: BarChart3, color: "text-purple-600 dark:text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <span className="text-xl font-bold" data-testid={`text-stat-${i}`}>{c.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrdersTab() {
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

  if (!orders?.length) return <p className="text-center text-muted-foreground py-8">{t("messages.noOrders")}</p>;

  return (
    <div className="space-y-3">
      {orders.map(order => (
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
  const [showAdd, setShowAdd] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [preferredStore, setPreferredStore] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowAdd(false);
      setNameAr(""); setNameEn(""); setEstimatedPrice(""); setPreferredStore(""); setCategoryId(""); setUnit("");
      toast({ title: t("messages.productAdded") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-product">
            <Plus className="w-4 h-4" /> {t("admin.addProduct")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.addProduct")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("fields.nameAr")} value={nameAr} onChange={e => setNameAr(e.target.value)} data-testid="input-product-name-ar" />
            <Input placeholder={t("fields.nameEn")} value={nameEn} onChange={e => setNameEn(e.target.value)} data-testid="input-product-name-en" dir="ltr" />
            <Input type="number" placeholder={t("fields.estimatedPrice")} value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} data-testid="input-product-price" />
            <Input placeholder={t("fields.store")} value={preferredStore} onChange={e => setPreferredStore(e.target.value)} data-testid="input-product-store" />
            <Input placeholder={t("fields.unit")} value={unit} onChange={e => setUnit(e.target.value)} data-testid="input-product-unit" />
            {categories && categories.length > 0 && (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger data-testid="select-product-category"><SelectValue placeholder={t("fields.category")} /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button className="w-full" disabled={!nameAr || createMutation.isPending} data-testid="button-save-product"
              onClick={() => createMutation.mutate({
                nameAr, nameEn: nameEn || null,
                estimatedPrice: estimatedPrice ? parseInt(estimatedPrice) : 0,
                preferredStore: preferredStore || null,
                categoryId: categoryId ? parseInt(categoryId) : null,
                unit: unit || null,
              })}>
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
            <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="font-medium">{p.nameAr}</span>
                {p.nameEn && <span className="text-sm text-muted-foreground mr-2">({p.nameEn})</span>}
                <div className="text-sm text-muted-foreground">
                  {p.estimatedPrice ? formatPrice(p.estimatedPrice) : ""} {p.preferredStore ? `- ${p.preferredStore}` : ""}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-product-${p.id}`}>
                <X className="w-4 h-4" />
              </Button>
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
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [icon, setIcon] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowAdd(false);
      setNameAr(""); setNameEn(""); setIcon("");
      toast({ title: t("admin.categoryAdded") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogTrigger asChild>
          <Button className="gap-2" data-testid="button-add-category">
            <Plus className="w-4 h-4" /> {t("admin.addCategory")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.addCategory")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("fields.nameAr")} value={nameAr} onChange={e => setNameAr(e.target.value)} data-testid="input-category-name-ar" />
            <Input placeholder={t("fields.nameEn")} value={nameEn} onChange={e => setNameEn(e.target.value)} data-testid="input-category-name-en" dir="ltr" />
            <Input placeholder={t("admin.iconCode")} value={icon} onChange={e => setIcon(e.target.value)} data-testid="input-category-icon" />
            <Button className="w-full" disabled={!nameAr || createMutation.isPending} data-testid="button-save-category"
              onClick={() => createMutation.mutate({ nameAr, nameEn: nameEn || null, icon: icon || null })}>
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
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)} data-testid={`button-delete-category-${c.id}`}>
                <X className="w-4 h-4" />
              </Button>
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("admin.userRoleUpdated") });
    },
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      {allUsers?.map(u => (
        <Card key={u.id} data-testid={`card-user-${u.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <div>
                <span className="font-medium">{u.firstName || u.username || t("roles.household")}</span>
                {u.username && <span className="text-xs text-muted-foreground block">@{u.username}</span>}
              </div>
              <Badge className="no-default-hover-elevate no-default-active-elevate">{t(`roles.${u.role}`)}</Badge>
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              <Select defaultValue={u.role} onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role, canApprove: role === "admin" ? true : u.canApprove })}>
                <SelectTrigger className="w-32" data-testid={`select-role-${u.id}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                  <SelectItem value="household">{t("roles.household")}</SelectItem>
                  <SelectItem value="maid">{t("roles.maid")}</SelectItem>
                  <SelectItem value="driver">{t("roles.driver")}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant={u.canApprove ? "default" : "outline"}
                onClick={() => updateRoleMutation.mutate({ id: u.id, role: u.role, canApprove: !u.canApprove })}
                data-testid={`button-toggle-approve-${u.id}`}>
                {u.canApprove ? t("admin.approvePermission") : t("admin.noApproval")}
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
  return (
    <div className="space-y-4">
      <StatsCards />
      <Tabs defaultValue="orders">
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
          <TabsTrigger value="users" className="gap-1" data-testid="tab-users">
            <Users className="w-4 h-4" /> {t("nav.users")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
