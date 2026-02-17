import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, ShoppingCart, Truck, Sparkles, Settings, Moon, Sun, Bell, BellOff, Check, X, RefreshCw, CheckCircle2, BellRing, Car } from "lucide-react";
import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import type { Room, HousekeepingTask, TaskCompletion } from "@shared/schema";
import { Switch as SwitchUI } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { t, getLang, setLang, formatDateTime, type Lang } from "@/lib/i18n";
import LoginPage from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminShopping from "@/pages/admin-shopping";
import AdminLogistics from "@/pages/admin-logistics";
import MaidDashboard from "@/pages/maid-dashboard";
import MaidHomePage from "@/pages/maid-home";
import DriverDashboard from "@/pages/driver-dashboard";
import DriverHomePage from "@/pages/driver-home";
import DriverLogisticsPage from "@/pages/driver-logistics";
import HouseholdDashboard from "@/pages/household-dashboard";
import homeBannerLight from "@assets/UseFBanner01_1771340927816.png";
import homeBannerDark from "@assets/UseFBanner02_1771340927815.png";
import groceriesBannerLight from "@assets/ShpBanner01_1771340185500.png";
import groceriesBannerDark from "@assets/ShpBanner02_1771340468754.png";
import HousekeepingPage from "@/pages/housekeeping";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

const LangContext = createContext<{ lang: Lang; toggleLang: () => void }>({ lang: "ar", toggleLang: () => {} });
export function useLang() { return useContext(LangContext); }

const allNavItems = [
  { key: "home", path: "/", icon: Home, labelKey: "nav.dashboard", hideFor: [] as string[] },
  { key: "groceries", path: "/groceries", icon: ShoppingCart, labelKey: "nav.groceries", hideFor: [] as string[] },
  { key: "logistics", path: "/logistics", icon: Truck, labelKey: "nav.logistics", hideFor: ["maid"] },
  { key: "housekeeping", path: "/housekeeping", icon: Sparkles, labelKey: "nav.housekeeping", hideFor: ["driver"] },
  { key: "settings", path: "/settings", icon: Settings, labelKey: "nav.settings", hideFor: [] as string[] },
];

function BottomNavBar() {
  useLang();
  const [location] = useLocation();
  const { user } = useAuth();
  const { unreadCounts } = useNotifications();
  const role = user?.role || "";

  const navItems = allNavItems.filter(item => !item.hideFor.includes(role));

  const tabCounts: Record<string, number> = {
    home: unreadCounts.home,
    groceries: unreadCounts.groceries,
    logistics: unreadCounts.logistics,
    housekeeping: unreadCounts.housekeeping,
    settings: 0,
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom" data-testid="bottom-nav">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
          const Icon = item.icon;
          const badgeCount = tabCounts[item.key] || 0;
          return (
            <Link key={item.key} href={item.path}>
              <button
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[4rem] transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                data-testid={`nav-${item.key}`}
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  isActive ? "bg-primary/10" : ""
                }`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-0.5" data-testid={`badge-nav-${item.key}`}>
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-tight ${isActive ? "font-bold" : "font-medium"}`}>
                  {t(item.labelKey)}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeBanner() {
  return (
    <div className="w-full overflow-hidden rounded-xl" style={{ maxHeight: "30vh" }} data-testid="banner-home">
      <img src={homeBannerLight} alt="" className="w-full h-full object-cover object-center block dark:hidden" style={{ maxHeight: "30vh" }} />
      <img src={homeBannerDark} alt="" className="w-full h-full object-cover object-center hidden dark:block" style={{ maxHeight: "30vh" }} />
    </div>
  );
}

function HouseholdTasksProgress() {
  useLang();
  const { user } = useAuth();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfWeek = today.getDay();

  const { data: rooms } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const { data: userRoomIds } = useQuery<number[]>({
    queryKey: ["/api/user-rooms", user?.id],
    queryFn: () => fetch(`/api/user-rooms/${user?.id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user,
  });
  const { data: tasks } = useQuery<HousekeepingTask[]>({ queryKey: ["/api/housekeeping-tasks"] });
  const { data: completions } = useQuery<TaskCompletion[]>({
    queryKey: ["/api/task-completions", todayStr],
    queryFn: () => fetch(`/api/task-completions/${todayStr}`, { credentials: "include" }).then(r => r.json()),
  });

  if (!userRoomIds || userRoomIds.length === 0 || !rooms || !tasks) {
    if (userRoomIds && userRoomIds.length === 0) {
      return (
        <Card data-testid="household-tasks-progress">
          <CardContent className="py-6 text-center text-muted-foreground">
            {t("householdHome.noRoomsAssigned")}
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const myRooms = rooms.filter(r => userRoomIds.includes(r.id) && r.isActive && !r.isExcluded);
  const myTasks = tasks.filter(task => {
    if (!myRooms.some(r => r.id === task.roomId)) return false;
    if (!task.isActive) return false;
    const taskDays = task.daysOfWeek as number[] | null;
    if (taskDays && taskDays.length > 0) return taskDays.includes(dayOfWeek);
    return true;
  });

  const completedIds = new Set(completions?.map(c => c.taskId) || []);
  const completedCount = myTasks.filter(task => completedIds.has(task.id)).length;
  const totalCount = myTasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const lang = getLang();
  let label: string;
  if (myRooms.length === 1) {
    label = lang === "ar" ? (myRooms[0].nameAr || "") : (myRooms[0].nameEn || myRooms[0].nameAr || "");
  } else {
    label = t("householdHome.myRooms");
  }

  return (
    <Card className="w-full h-full" data-testid="household-tasks-progress">
      <CardContent className="py-4 space-y-3 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="font-semibold">{label}</span>
          </div>
          <Badge className="no-default-hover-elevate no-default-active-elevate bg-primary/10 text-primary">
            {completedCount}/{totalCount} {t("householdHome.tasksDone")}
          </Badge>
        </div>
        {totalCount > 0 ? (
          <div className="space-y-1">
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${percentage}%` }}
                data-testid="progress-bar"
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">{percentage}%</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">{t("householdHome.noTasksToday")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CallMaidButton() {
  useLang();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: maidCalls = [] } = useQuery<any[]>({
    queryKey: ["/api/maid-calls"],
    refetchInterval: 5000,
  });

  const myCall = maidCalls.find((c: any) => c.calledBy === user?.id);
  const hasActiveCall = myCall?.status === "active";
  const TWO_MINUTES = 2 * 60 * 1000;
  const isDismissedRecently = myCall?.status === "dismissed" && myCall?.dismissedAt &&
    (Date.now() - new Date(myCall.dismissedAt).getTime()) < TWO_MINUTES;

  const callMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/maid-calls", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maid-calls"] });
      toast({ title: t("householdHome.callSent") });
    },
  });

  if (isDismissedRecently) {
    return (
      <Card className="w-full h-full" data-testid="card-maid-coming">
        <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
            <BellRing className="w-7 h-7 text-green-500" />
          </div>
          <span className="text-sm font-semibold text-center text-green-600 dark:text-green-400">
            {t("householdHome.maidComing")}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (hasActiveCall) {
    return (
      <Card className="w-full h-full" data-testid="card-call-waiting">
        <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
          <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
            <BellRing className="w-7 h-7 text-orange-500 animate-pulse" />
          </div>
          <span className="text-sm font-semibold text-center text-orange-600 dark:text-orange-400">
            {t("householdHome.callSent")}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer w-full h-full"
      onClick={() => !callMutation.isPending && callMutation.mutate()}
      data-testid="button-call-maid"
    >
      <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
        <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
          <BellRing className="w-7 h-7 text-orange-500" />
        </div>
        <span className="text-sm font-semibold text-center">
          {callMutation.isPending ? t("householdHome.calling") : t("householdHome.callMaid")}
        </span>
      </CardContent>
    </Card>
  );
}

function CallDriverButton() {
  useLang();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: driverCalls = [] } = useQuery<any[]>({
    queryKey: ["/api/driver-calls"],
    refetchInterval: 5000,
  });

  const myCall = driverCalls.find((c: any) => c.calledBy === user?.id);
  const hasActiveCall = myCall?.status === "active";
  const TWO_MINUTES = 2 * 60 * 1000;
  const isDismissedRecently = myCall?.status === "dismissed" && myCall?.dismissedAt &&
    (Date.now() - new Date(myCall.dismissedAt).getTime()) < TWO_MINUTES;

  const callMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/driver-calls", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-calls"] });
      toast({ title: t("householdHome.driverCallSent") });
    },
  });

  if (isDismissedRecently) {
    return (
      <Card className="w-full h-full" data-testid="card-driver-coming">
        <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
            <Car className="w-7 h-7 text-green-500" />
          </div>
          <span className="text-sm font-semibold text-center text-green-600 dark:text-green-400">
            {t("householdHome.driverComing")}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (hasActiveCall) {
    return (
      <Card className="w-full h-full" data-testid="card-driver-call-waiting">
        <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Car className="w-7 h-7 text-blue-500 animate-pulse" />
          </div>
          <span className="text-sm font-semibold text-center text-blue-600 dark:text-blue-400">
            {t("householdHome.driverCallSent")}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer w-full h-full"
      onClick={() => !callMutation.isPending && callMutation.mutate()}
      data-testid="button-call-driver"
    >
      <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
        <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Car className="w-7 h-7 text-blue-500" />
        </div>
        <span className="text-sm font-semibold text-center">
          {callMutation.isPending ? t("householdHome.driverCalling") : t("householdHome.callDriver")}
        </span>
      </CardContent>
    </Card>
  );
}

function HomeContent() {
  const { user } = useAuth();
  if (!user) return null;
  const showBanner = user.role !== "driver" && user.role !== "maid";
  switch (user.role) {
    case "admin": return (
      <div className="space-y-4">
        {showBanner && <HomeBanner />}
        <AdminDashboard />
      </div>
    );
    case "maid": return <MaidHomePage />;
    case "driver": return <DriverHomePage />;
    default: return (
      <div className="space-y-4">
        {showBanner && <HomeBanner />}
        <HouseholdTasksProgress />
        <div className="flex gap-4">
          <div className="w-1/3">
            <CallMaidButton />
          </div>
          <div className="w-1/3">
            <CallDriverButton />
          </div>
        </div>
      </div>
    );
  }
}

function GroceriesBanner() {
  return (
    <div className="w-full overflow-hidden rounded-xl" style={{ maxHeight: "20vh" }} data-testid="banner-groceries">
      <img src={groceriesBannerLight} alt="" className="w-full h-full object-cover object-center block dark:hidden" style={{ maxHeight: "20vh" }} />
      <img src={groceriesBannerDark} alt="" className="w-full h-full object-cover object-center hidden dark:block" style={{ maxHeight: "20vh" }} />
    </div>
  );
}

function GroceriesContent() {
  const { user } = useAuth();
  if (!user) return null;
  const showBanner = user.role !== "driver" && user.role !== "maid";
  let content;
  switch (user.role) {
    case "admin": content = <AdminShopping />; break;
    case "maid": return <MaidDashboard />;
    case "driver": return <DriverDashboard />;
    default: content = <HouseholdDashboard />; break;
  }
  return (
    <div className="space-y-4">
      {showBanner && <GroceriesBanner />}
      {content}
    </div>
  );
}

function LogisticsContent() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user) return null;
  if (user.role === "maid") {
    setLocation("/");
    return null;
  }
  if (user.role === "driver") return <DriverLogisticsPage />;
  return <AdminLogistics />;
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications();
  const recent = (notifications as any[]).slice(0, 20);

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose} data-testid="notification-overlay">
      <div
        className="absolute top-14 left-3 right-3 max-w-md mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <Card className="shadow-lg" data-testid="notification-panel">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 p-3 border-b">
              <h3 className="text-sm font-bold">{t("notifications.title")}</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={markAllRead} data-testid="button-mark-all-read">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-xs">{t("notifications.markAllRead")}</span>
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-notifications">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm" data-testid="text-no-notifications">
                  {t("notifications.empty")}
                </div>
              ) : (
                recent.map((notif: any) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-2 p-3 border-b last:border-0 cursor-pointer hover-elevate ${!notif.isRead ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      if (!notif.isRead) markRead(notif.id);
                      if (notif.url) window.location.href = notif.url;
                      onClose();
                    }}
                    data-testid={`notification-item-${notif.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.isRead ? "font-bold" : ""}`}>
                        {lang === "ar" ? notif.titleAr : (notif.titleEn || notif.titleAr)}
                      </p>
                      {(notif.bodyAr || notif.bodyEn) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {lang === "ar" ? notif.bodyAr : (notif.bodyEn || notif.bodyAr)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDateTime(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AppHeader() {
  const { lang, toggleLang } = useLang();
  const { unreadCount, requestPermission, permissionState } = useNotifications();
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [showNotifs, setShowNotifs] = useState(false);

  const toggleTheme = () => {
    setDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return next;
    });
  };

  const handleBellClick = async () => {
    if (permissionState === "default") {
      await requestPermission();
    }
    setShowNotifs(!showNotifs);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm safe-area-top">
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="flex items-center gap-1.5" data-testid="lang-toggle-header">
            <span className={`text-xs ${lang === "ar" ? "font-bold" : "text-muted-foreground"}`}>ع</span>
            <SwitchUI
              checked={lang === "en"}
              onCheckedChange={toggleLang}
              className="h-5 w-9 [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:ltr:translate-x-4 [&>span]:data-[state=checked]:rtl:-translate-x-4"
              data-testid="switch-lang-header"
            />
            <span className={`text-xs ${lang === "en" ? "font-bold" : "text-muted-foreground"}`}>EN</span>
          </div>
          <h1 className="text-sm font-bold" data-testid="text-header-title">{t("app.name")}</h1>
          <div className="flex items-center gap-1">
            <div className="relative">
              <Button size="icon" variant="ghost" onClick={handleBellClick} data-testid="button-notifications">
                {permissionState === "denied" ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </Button>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-[1rem] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-0.5" data-testid="badge-header-unread">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-header">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>
      {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
    </>
  );
}

function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const threshold = 80;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || refreshing) return;
    if (el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) {
      pulling.current = false;
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.4, 120));
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(threshold * 0.5);
      await queryClient.invalidateQueries();
      await new Promise(r => setTimeout(r, 400));
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, refreshing]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : "0px" }}
      >
        <RefreshCw
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: refreshing ? undefined : `rotate(${(pullDistance / threshold) * 360}deg)`, opacity: Math.min(pullDistance / (threshold * 0.5), 1) }}
        />
      </div>
      {children}
    </div>
  );
}

function MainLayout() {
  useLang();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <PullToRefresh>
        <main className="flex-1 p-3 pb-28 max-w-2xl mx-auto w-full">
          <Switch>
            <Route path="/" component={HomeContent} />
            <Route path="/groceries" component={GroceriesContent} />
            <Route path="/logistics" component={LogisticsContent} />
            <Route path="/housekeeping" component={HousekeepingPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </PullToRefresh>
      <BottomNavBar />
    </div>
  );
}

function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-sm p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <MainLayout />;
}

function App() {
  const [lang, setLangState] = useState<Lang>(getLang());

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleLang = useCallback(() => {
    const newLang = lang === "ar" ? "en" : "ar";
    setLang(newLang);
    setLangState(newLang);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppLayout />
        </TooltipProvider>
      </QueryClientProvider>
    </LangContext.Provider>
  );
}

export default App;
