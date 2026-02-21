import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, ShoppingBag, BarChart3, PieChart, ArrowUpDown, Package } from "lucide-react";
import { t, formatPrice, getLang } from "@/lib/i18n";
import { SarIcon } from "@/components/sar-icon";
import { useLang } from "@/App";
import { useState } from "react";

interface ProductStat {
  productId: number;
  nameAr: string;
  nameEn: string | null;
  count: number;
  totalEstimated: number;
  totalActual: number;
  actualCount: number;
}

interface PriceComparison extends ProductStat {
  avgEstimated: number;
  avgActual: number;
  difference: number;
  percentDiff: number;
}

interface MonthlyData {
  month: string;
  estimated: number;
  actual: number;
  count: number;
}

interface CategoryData {
  id: number;
  nameAr: string;
  nameEn: string | null;
  total: number;
  count: number;
}

interface ReportsData {
  topProducts: ProductStat[];
  priceComparisons: PriceComparison[];
  monthlySpending: MonthlyData[];
  topCategories: CategoryData[];
  orderStatusCounts: Record<string, number>;
  totalOrders: number;
  totalCompleted: number;
  totalProducts: number;
}

type Tab = "topProducts" | "priceComparison" | "monthlySpending" | "categorySpending";

const MONTH_NAMES_AR: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

const MONTH_NAMES_EN: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

function getMonthLabel(monthKey: string): string {
  const [, m] = monthKey.split("-");
  return getLang() === "ar" ? (MONTH_NAMES_AR[m] || m) : (MONTH_NAMES_EN[m] || m);
}

function pName(item: { nameAr: string; nameEn: string | null }): string {
  return getLang() === "ar" ? item.nameAr : (item.nameEn || item.nameAr);
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#3b82f6",
  in_progress: "#a855f7",
  completed: "#22c55e",
  rejected: "#ef4444",
};

export default function AdminReports() {
  useLang();
  const [activeTab, setActiveTab] = useState<Tab>("topProducts");

  const { data: reports, isLoading } = useQuery<ReportsData>({
    queryKey: ["/api/reports"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!reports) {
    return <p className="text-center text-sm text-muted-foreground py-8">{t("reports.noData")}</p>;
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "topProducts", label: t("reports.topProducts"), icon: ShoppingBag },
    { key: "priceComparison", label: t("reports.priceComparison"), icon: ArrowUpDown },
    { key: "monthlySpending", label: t("reports.monthlySpending"), icon: BarChart3 },
    { key: "categorySpending", label: t("reports.categorySpending"), icon: PieChart },
  ];

  const totalStatus = Object.values(reports.orderStatusCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{reports.totalOrders}</p>
            <p className="text-[10px] text-muted-foreground">{t("stats.totalOrders")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{reports.totalCompleted}</p>
            <p className="text-[10px] text-muted-foreground">{t("stats.completedOrders")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reports.totalProducts}</p>
            <p className="text-[10px] text-muted-foreground">{t("nav.products")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3">
          <p className="text-xs font-semibold mb-2">{t("reports.orderStatus")}</p>
          <div className="flex rounded-full overflow-hidden h-4" data-testid="chart-order-status">
            {Object.entries(reports.orderStatusCounts).map(([status, count]) => (
              count > 0 ? (
                <div
                  key={status}
                  className="h-full relative group"
                  style={{
                    width: `${(count / totalStatus) * 100}%`,
                    backgroundColor: STATUS_COLORS[status] || "#6b7280",
                    minWidth: count > 0 ? "8px" : "0",
                  }}
                  title={`${t(`status.${status}`)}: ${count}`}
                />
              ) : null
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(reports.orderStatusCounts).map(([status, count]) => (
              count > 0 ? (
                <div key={status} className="flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                  <span>{t(`status.${status}`)}: {count}</span>
                </div>
              ) : null
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" data-testid="reports-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`flex items-center gap-1 text-xs px-3 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "topProducts" && (
        <Card>
          <CardContent className="p-3 space-y-2">
            {reports.topProducts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">{t("reports.noData")}</p>
            ) : (
              reports.topProducts.map((p, i) => {
                const maxCount = reports.topProducts[0]?.count || 1;
                return (
                  <div key={p.productId} className="flex items-center gap-2" data-testid={`row-top-product-${i}`}>
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{pName(p)}</span>
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px] shrink-0">
                          {p.count} {t("reports.times")}
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(p.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "priceComparison" && (
        <Card>
          <CardContent className="p-3 space-y-3">
            {reports.priceComparisons.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">{t("reports.noData")}</p>
            ) : (
              reports.priceComparisons.map((p, i) => {
                const isHigher = p.difference > 0;
                return (
                  <div key={p.productId} className="border-b last:border-0 pb-2 last:pb-0" data-testid={`row-price-comparison-${i}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{pName(p)}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isHigher ? (
                          <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                        )}
                        <span className={`text-xs font-bold ${isHigher ? "text-red-500" : "text-green-500"}`}>
                          {p.percentDiff > 0 ? "+" : ""}{p.percentDiff.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
                        <span className="text-muted-foreground">{t("reports.estimated")}</span>
                        <span className="font-semibold inline-flex items-center gap-0.5">{formatPrice(p.avgEstimated)} <SarIcon className="w-2.5 h-2.5" /></span>
                      </div>
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
                        <span className="text-muted-foreground">{t("reports.actual")}</span>
                        <span className="font-semibold inline-flex items-center gap-0.5">{formatPrice(p.avgActual)} <SarIcon className="w-2.5 h-2.5" /></span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "monthlySpending" && (
        <Card>
          <CardContent className="p-3">
            {reports.monthlySpending.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">{t("reports.noData")}</p>
            ) : (
              <>
                <div className="space-y-3">
                  {(() => {
                    const maxVal = Math.max(...reports.monthlySpending.map(m => Math.max(m.estimated, m.actual)), 1);
                    return reports.monthlySpending.map((m, i) => {
                      const hasData = m.estimated > 0 || m.actual > 0;
                      return (
                        <div key={m.month} data-testid={`row-monthly-${i}`} className={!hasData ? "opacity-60" : ""}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium">{getMonthLabel(m.month)}</span>
                            <span className="text-muted-foreground">{m.count} {t("reports.orders")}</span>
                          </div>
                          {hasData ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] w-12 text-muted-foreground">{t("reports.estimated")}</span>
                                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(m.estimated / maxVal) * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-medium w-16 text-end inline-flex items-center justify-end gap-0.5">{formatPrice(m.estimated)} <SarIcon className="w-2 h-2" /></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] w-12 text-muted-foreground">{t("reports.actual")}</span>
                                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(m.actual / maxVal) * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-medium w-16 text-end inline-flex items-center justify-end gap-0.5">{formatPrice(m.actual)} <SarIcon className="w-2 h-2" /></span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-muted rounded-full border border-dashed border-muted-foreground/30" />
                              <span className="text-[10px] text-muted-foreground">{t("reports.noData")}</span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex gap-4 justify-center mt-3 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>{t("reports.estimated")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span>{t("reports.actual")}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "categorySpending" && (
        <Card>
          <CardContent className="p-3 space-y-2">
            {reports.topCategories.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">{t("reports.noData")}</p>
            ) : (
              (() => {
                const maxTotal = reports.topCategories[0]?.total || 1;
                const CAT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];
                const totalAll = reports.topCategories.reduce((s, c) => s + c.total, 0) || 1;
                return (
                  <>
                    <div className="flex rounded-full overflow-hidden h-5 mb-3" data-testid="chart-category-spending">
                      {reports.topCategories.map((c, i) => (
                        <div
                          key={c.id}
                          className="h-full"
                          style={{
                            width: `${(c.total / totalAll) * 100}%`,
                            backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
                            minWidth: "4px",
                          }}
                          title={`${pName(c)}: ${formatPrice(c.total)}`}
                        />
                      ))}
                    </div>
                    {reports.topCategories.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2" data-testid={`row-category-${i}`}>
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="text-sm flex-1 truncate">{pName(c)}</span>
                        <span className="text-xs text-muted-foreground">{c.count} {t("reports.times")}</span>
                        <span className="text-xs font-semibold inline-flex items-center gap-0.5">{formatPrice(c.total)} <SarIcon className="w-2.5 h-2.5" /></span>
                      </div>
                    ))}
                  </>
                );
              })()
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
