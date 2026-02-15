import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart, Milk, Apple, Beef, Fish, Egg, Cookie, Coffee,
  Droplets, Sparkles, Shirt, Pill, Baby, Sandwich, IceCream, Wheat,
  CircleDot, CupSoda, Citrus, Carrot, Cherry, Grape, Banana, Nut,
  Send, Package, Plus, Minus, X, Image as ImageIcon, RefreshCw
} from "lucide-react";
import { useState } from "react";
import type { Product, Category, Order } from "@shared/schema";
import { t } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { ShortagesSection } from "@/pages/admin-shopping";

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

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const totalEstimated = cart.reduce((sum, item) => sum + (item.product.estimatedPrice || 0) * item.quantity, 0);
      const res = await apiRequest("POST", "/api/orders", { notes, totalEstimated });
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

  const pendingOrders = orders?.filter(o => o.status === "pending" || o.status === "approved") || [];
  const activeOrders = orders?.filter(o => o.status === "in_progress") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold">{t("nav.addItems")}</h2>
        <div className="flex items-center gap-2">
          {activeOrders.length > 0 && (
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

      {pendingOrders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t("driver.yourOrders")}</h3>
          {pendingOrders.map(o => (
            <Card key={o.id} data-testid={`card-maid-order-${o.id}`}>
              <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                <span>#{o.id}</span>
                <Badge className={`no-default-hover-elevate no-default-active-elevate ${o.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                  {t(`status.${o.status}`)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeOrders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> {t("status.in_progress")}
          </h3>
          {activeOrders.map(o => (
            <Card key={o.id} data-testid={`card-maid-active-order-${o.id}`}>
              <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                <span>#{o.id}</span>
                <Badge className="no-default-hover-elevate no-default-active-elevate bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  {t("status.in_progress")}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                <Icon className="w-4 h-4" /> {c.nameAr}
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
                      <img src={product.imageUrl} alt={product.nameAr} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <Icon className="w-8 h-8 mb-2 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium leading-tight">{product.nameAr}</span>
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

      {user?.canAddShortages && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-bold flex items-center gap-2" data-testid="text-shortages-section">
            {t("shortages.title")}
          </h3>
          <ShortagesSection />
        </div>
      )}

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
                    <span className="font-medium text-sm">{item.product.nameAr}</span>
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
            {activeOrders.length > 0 && (
              <Select value={selectedOrderForUpdate} onValueChange={setSelectedOrderForUpdate}>
                <SelectTrigger data-testid="select-active-order"><SelectValue placeholder={t("maid.selectOrder")} /></SelectTrigger>
                <SelectContent>
                  {activeOrders.map(o => <SelectItem key={o.id} value={String(o.id)}>#{o.id}</SelectItem>)}
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
                            <img src={product.imageUrl} alt={product.nameAr} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <Icon className="w-6 h-6 mb-1 text-muted-foreground" />
                        )}
                        <span className="text-[10px] font-medium leading-tight">{product.nameAr}</span>
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
                        <span className="text-sm">{item.product.nameAr} x{item.quantity}</span>
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
