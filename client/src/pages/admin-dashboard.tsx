import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, ShoppingCart, Check, BarChart3, Car, MapPin, Users, Wrench, ArrowLeft } from "lucide-react";
import { t, formatPrice } from "@/lib/i18n";
import { useLang } from "@/App";
import { Link } from "wouter";

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
    { label: t("stats.totalOrders"), sub: t("stats.completedSub"), value: stats?.total || 0, icon: ClipboardList, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { label: t("stats.pendingOrders"), sub: t("stats.completedSub"), value: stats?.pending || 0, icon: ShoppingCart, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
    { label: t("stats.completedOrders"), sub: t("stats.completedSub"), value: stats?.completed || 0, icon: Check, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
    { label: t("stats.totalSpent"), sub: t("stats.spentSub"), value: formatPrice(stats?.totalSpent || 0), icon: BarChart3, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Card key={i} data-testid={`card-stat-${i}`}>
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

export default function AdminDashboard() {
  useLang();

  const quickLinks = [
    { label: t("nav.shoppingSection"), icon: ShoppingCart, href: "/admin/shopping", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", desc: `${t("nav.orders")} - ${t("nav.products")} - ${t("nav.categories")} - ${t("nav.stores")}` },
    { label: t("nav.logisticsSection"), icon: Car, href: "/admin/logistics", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", desc: `${t("nav.vehicles")} - ${t("nav.trips")} - ${t("nav.technicians")}` },
    { label: t("nav.users"), icon: Users, href: "/admin/users", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30", desc: t("admin.approvePermission") },
  ];

  return (
    <div className="space-y-6">
      <StatsCards />

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3" data-testid="text-quick-links">{t("nav.quickLinks")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map((link, i) => (
            <Link key={i} href={link.href}>
              <Card className="cursor-pointer hover-elevate active-elevate-2 h-full" data-testid={`card-quick-link-${i}`}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${link.bg} flex items-center justify-center`}>
                    <link.icon className={`w-6 h-6 ${link.color}`} />
                  </div>
                  <div>
                    <span className="font-medium text-sm">{link.label}</span>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{link.desc}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
