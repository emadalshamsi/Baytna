import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, ShoppingCart, Check, BarChart3, ChevronDown, ChevronUp, ExternalLink, User, MapPin, Clock, Cog, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { t, formatPrice, displayName, formatDate, formatDateTime } from "@/lib/i18n";
import { SarIcon } from "@/components/sar-icon";
import { useLang } from "@/App";
import { useState } from "react";
import type { Order, Trip, SparePartOrder, User as UserType } from "@shared/schema";
import AdminReports from "@/pages/admin-reports";

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

type StatFilter = "total" | "pending" | "completed" | "spent" | null;

export default function AdminDashboard() {
  useLang();
  const [activeFilter, setActiveFilter] = useState<StatFilter>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<{ pending: number; pendingOrders: number; pendingTrips: number; pendingSparePartOrders: number; approved: number; inProgress: number; completed: number; total: number; totalOrders: number; totalTrips: number; totalSparePartOrders: number; totalSpent: number; sparePartsSpent: number; monthlyBudget: number | null; weekStart: string; weekEnd: string }>({
    queryKey: ["/api/stats"],
  });

  const { data: orders } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: trips } = useQuery<Trip[]>({ queryKey: ["/api/trips"] });
  const { data: sparePartOrders } = useQuery<SparePartOrder[]>({ queryKey: ["/api/spare-part-orders"] });
  const { data: users } = useQuery<UserType[]>({ queryKey: ["/api/users"] });

  const userMap = new Map((users || []).map(u => [u.id, u]));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekRange = stats ? { start: new Date(stats.weekStart as any), end: new Date(stats.weekEnd as any) } : null;

  const filteredOrders = orders?.filter(o => {
    if (activeFilter === "total") return true;
    if (activeFilter === "pending") return o.status === "pending";
    if (activeFilter === "completed") return o.status === "completed" && weekRange && o.createdAt && new Date(o.createdAt) >= weekRange.start && new Date(o.createdAt) <= weekRange.end;
    if (activeFilter === "spent") return o.status === "completed" && o.createdAt && new Date(o.createdAt) >= monthStart;
    return false;
  }) || [];

  const filteredTrips = trips?.filter(tr => {
    if (activeFilter === "total") return true;
    if (activeFilter === "pending") return tr.status === "pending";
    if (activeFilter === "completed") return tr.status === "completed" && tr.completedAt && weekRange && new Date(tr.completedAt) >= weekRange.start && new Date(tr.completedAt) <= weekRange.end;
    return false;
  }) || [];

  const filteredSparePartOrders = sparePartOrders?.filter(spo => {
    if (activeFilter === "total") return true;
    if (activeFilter === "pending") return spo.status === "pending";
    if (activeFilter === "completed") return spo.status === "completed" && spo.createdAt && weekRange && new Date(spo.createdAt) >= weekRange.start && new Date(spo.createdAt) <= weekRange.end;
    if (activeFilter === "spent") return spo.status === "completed" && spo.createdAt && new Date(spo.createdAt) >= monthStart;
    return false;
  }) || [];

  const totalFilteredCount = filteredOrders.length + filteredTrips.length + filteredSparePartOrders.length;

  const cards = [
    { key: "total" as StatFilter, label: t("stats.totalOrders"), sub: t("stats.completedSub"), value: stats?.total || 0, icon: ClipboardList, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { key: "pending" as StatFilter, label: t("stats.pendingOrders"), sub: t("stats.completedSub"), value: stats?.pending || 0, icon: ShoppingCart, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
    { key: "completed" as StatFilter, label: t("stats.completedOrders"), sub: t("stats.completedSub"), value: stats?.completed || 0, icon: Check, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
    { key: "spent" as StatFilter, label: t("stats.totalSpent"), sub: t("stats.spentSub"), value: formatPrice(stats?.totalSpent || 0), icon: BarChart3, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  ];

  const filterTitle = (f: StatFilter) => {
    if (f === "total") return t("stats.totalOrders");
    if (f === "pending") return t("stats.pendingOrders");
    if (f === "completed") return t("stats.completedOrders");
    if (f === "spent") return t("stats.totalSpent");
    return "";
  };

  return (
    <div className="space-y-6">
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((c, i) => {
            const isActive = activeFilter === c.key;
            return (
              <Card
                key={i}
                className={`cursor-pointer hover-elevate active-elevate-2 ${isActive ? "ring-2 ring-primary" : ""}`}
                onClick={() => setActiveFilter(isActive ? null : c.key)}
                data-testid={`card-stat-${i}`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center`}>
                    <c.icon className={`w-5 h-5 ${c.color}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground leading-tight">{c.label}</span>
                    {c.sub && <span className="text-[10px] text-muted-foreground leading-tight">{c.sub}</span>}
                  </div>
                  <span className="text-xl font-bold inline-flex items-center gap-0.5" data-testid={`text-stat-${i}`}>{c.value} {c.key === "spent" && <SarIcon className="w-3 h-3 inline-block" />}</span>
                  {isActive ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {stats?.monthlyBudget != null && stats.monthlyBudget > 0 && (
        <Card data-testid="card-budget-comparison">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                {t("stats.monthlyBudget")}
              </h3>
              <span className="text-xs text-muted-foreground">{t("stats.thisMonth")}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">{t("stats.budget")}</div>
                <div className="text-sm font-bold inline-flex items-center gap-0.5">{formatPrice(stats.monthlyBudget)} <SarIcon className="w-2.5 h-2.5" /></div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">{t("stats.actual")}</div>
                <div className="text-sm font-bold inline-flex items-center gap-0.5">{formatPrice(stats.totalSpent)} <SarIcon className="w-2.5 h-2.5" /></div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">{stats.totalSpent > stats.monthlyBudget ? t("stats.overBudget") : t("stats.remaining")}</div>
                <div className={`text-sm font-bold inline-flex items-center gap-0.5 ${stats.totalSpent > stats.monthlyBudget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  {stats.totalSpent > stats.monthlyBudget ? (
                    <><TrendingUp className="w-3 h-3" /> {formatPrice(stats.totalSpent - stats.monthlyBudget)}</>
                  ) : (
                    <><TrendingDown className="w-3 h-3" /> {formatPrice(stats.monthlyBudget - stats.totalSpent)}</>
                  )}
                  <SarIcon className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
            {(() => {
              const pct = Math.min(Math.round((stats.totalSpent / stats.monthlyBudget) * 100), 100);
              const overPct = stats.totalSpent > stats.monthlyBudget ? Math.round(((stats.totalSpent - stats.monthlyBudget) / stats.monthlyBudget) * 100) : 0;
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{t("stats.budgetUsed")}</span>
                    <span>{pct + overPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${stats.totalSpent > stats.monthlyBudget ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(pct + overPct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {activeFilter && totalFilteredCount > 0 && (
        <div className="space-y-3" data-testid="filtered-orders-list">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {filterTitle(activeFilter)} ({totalFilteredCount})
          </h3>
          {filteredOrders.map(order => {
            const creator = userMap.get(order.createdBy);
            const orderTotal = order.totalActual || order.totalEstimated || 0;
            return (
              <Card key={`order-${order.id}`} data-testid={`card-dashboard-order-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs">{t("nav.groceries")}</Badge>
                      <span className="font-medium text-sm">#{order.id}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <span className="font-semibold text-sm inline-flex items-center gap-0.5">{formatPrice(orderTotal)} <SarIcon className="w-3 h-3 inline-block" /></span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
                    {order.totalActual ? (
                      <span className="inline-flex items-center gap-0.5">{t("fields.actualPrice")}: {formatPrice(order.totalActual)} <SarIcon className="w-2.5 h-2.5 inline-block" /></span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5">{t("fields.estimatedPrice")}: {formatPrice(order.totalEstimated || 0)} <SarIcon className="w-2.5 h-2.5 inline-block" /></span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1">
                    {creator && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {t("fields.createdBy")}: {displayName(creator)}
                      </span>
                    )}
                    <span className="text-foreground/80 font-medium">{formatDate(order.createdAt!)}</span>
                  </div>
                  {order.notes && <p className="text-xs text-muted-foreground mt-1">{order.notes}</p>}
                  {order.receiptImageUrl && (
                    <a href={order.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1 mt-1" data-testid={`link-receipt-${order.id}`}>
                      {t("fields.receipt")} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredTrips.map(trip => {
            const creator = userMap.get(trip.createdBy);
            return (
              <Card key={`trip-${trip.id}`} data-testid={`card-dashboard-trip-${trip.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs">{t("trips.title")}</Badge>
                      <span className="font-medium text-sm">#{trip.id}</span>
                      <StatusBadge status={trip.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {trip.personName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {trip.location}
                    </span>
                    {trip.departureTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> <span className="text-foreground/80 font-medium">{formatDateTime(trip.departureTime)}</span>
                      </span>
                    )}
                  </div>
                  {trip.notes && <p className="text-xs text-muted-foreground mt-1">{trip.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
          {filteredSparePartOrders.map(spo => {
            const creator = userMap.get(spo.createdBy);
            const assignee = spo.assignedTo ? userMap.get(spo.assignedTo) : null;
            return (
              <Card key={`sp-${spo.id}`} data-testid={`card-dashboard-sp-${spo.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs gap-1">
                        <Cog className="w-3 h-3" /> {t("nav.spareParts")}
                      </Badge>
                      <span className="font-medium text-sm">#{spo.id}</span>
                      <StatusBadge status={spo.status} />
                    </div>
                    <span className="font-semibold text-sm inline-flex items-center gap-0.5">{formatPrice(spo.totalEstimated || 0)} <SarIcon className="w-3 h-3 inline-block" /></span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1">
                    {creator && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {t("fields.createdBy")}: {displayName(creator)}
                      </span>
                    )}
                    {assignee && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {t("spareParts.assignedTo")}: {displayName(assignee)}
                      </span>
                    )}
                    <span className="text-foreground/80 font-medium">{formatDate(spo.createdAt!)}</span>
                  </div>
                  {spo.notes && <p className="text-xs text-muted-foreground mt-1">{spo.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
          {activeFilter === "spent" && (
            <Card data-testid="card-spending-total">
              <CardContent className="p-4 flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{t("fields.total")}</span>
                <span className="font-bold text-lg inline-flex items-center gap-0.5">
                  {formatPrice(
                    filteredOrders.reduce((sum, o) => sum + (o.totalActual || o.totalEstimated || 0), 0) +
                    filteredSparePartOrders.reduce((sum, spo) => sum + (spo.totalEstimated || 0), 0)
                  )} <SarIcon className="w-3 h-3 inline-block" />
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeFilter && totalFilteredCount === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">{t("messages.noOrders")}</p>
      )}

      <div className="border-t pt-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          {t("reports.title")}
        </h2>
        <AdminReports />
      </div>
    </div>
  );
}
