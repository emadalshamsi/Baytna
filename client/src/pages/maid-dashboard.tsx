import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ShoppingCart, Plus, Milk, Apple, Beef, Fish, Egg, Cookie, Coffee,
  Droplets, Sparkles, Shirt, Pill, Baby, Sandwich, IceCream, Wheat,
  CircleDot, CupSoda, Citrus, Carrot, Cherry, Grape, Banana, Nut,
  Send, Package
} from "lucide-react";
import { useState } from "react";
import type { Product, Category, Order } from "@shared/schema";
import { t, formatPrice } from "@/lib/i18n";

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
  const { toast } = useToast();
  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: orders } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const [cart, setCart] = useState<{ productId: number; quantity: number; product: Product }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

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

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, quantity: 1, product }];
    });
    toast({ title: `${product.nameAr} +1` });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const filteredProducts = selectedCategory
    ? products?.filter(p => p.categoryId === selectedCategory)
    : products;

  const pendingOrders = orders?.filter(o => o.status === "pending" || o.status === "approved") || [];

  return (
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

      {pendingOrders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">طلباتك الحالية</h3>
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

      {categories && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button size="sm" variant={selectedCategory === null ? "default" : "outline"} onClick={() => setSelectedCategory(null)} data-testid="button-category-all">
            الكل
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
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-md border text-center transition-colors min-h-[100px] hover-elevate active-elevate-2 ${inCart ? "border-primary bg-primary/5" : "bg-card"}`}
                data-testid={`button-add-product-${product.id}`}
              >
                <Icon className="w-8 h-8 mb-2 text-muted-foreground" />
                <span className="text-xs font-medium leading-tight">{product.nameAr}</span>
                {product.estimatedPrice ? (
                  <span className="text-[10px] text-muted-foreground mt-1">{formatPrice(product.estimatedPrice)}</span>
                ) : null}
                {inCart && (
                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {inCart.quantity}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent>
          <DialogHeader><DialogTitle>سلة المشتريات ({cart.reduce((s, i) => s + i.quantity, 0)})</DialogTitle></DialogHeader>
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">السلة فارغة</p>
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
                      setCart(prev => prev.map(i => i.productId === item.productId && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i));
                    }} data-testid={`button-decrease-${item.productId}`}>-</Button>
                    <Button size="icon" variant="ghost" onClick={() => addToCart(item.product)} data-testid={`button-increase-${item.productId}`}>+</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.productId)} data-testid={`button-remove-${item.productId}`}>
                      <span className="text-destructive text-lg">&times;</span>
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <span className="font-bold">{t("fields.total")}</span>
                <span className="font-bold">{formatPrice(cart.reduce((s, i) => s + (i.product.estimatedPrice || 0) * i.quantity, 0))}</span>
              </div>
              <Textarea placeholder={t("fields.notes")} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" data-testid="input-order-notes" />
              <Button className="w-full gap-2" onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} data-testid="button-submit-order">
                <Send className="w-4 h-4" /> إرسال الطلب
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
