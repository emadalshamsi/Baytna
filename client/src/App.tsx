import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, ShoppingCart, Truck, Sparkles, Settings, Moon, Sun, Bell, BellOff, Check, X, RefreshCw } from "lucide-react";
import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
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
import HouseholdDashboard from "@/pages/household-dashboard";
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
  const { unreadCount } = useNotifications();
  const role = user?.role || "";

  const navItems = allNavItems.filter(item => !item.hideFor.includes(role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom" data-testid="bottom-nav">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
          const Icon = item.icon;
          const showBadge = item.key === "home" && unreadCount > 0;
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
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-0.5" data-testid="badge-nav-unread">
                      {unreadCount > 99 ? "99+" : unreadCount}
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

function HomeContent() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case "admin": return <AdminDashboard />;
    case "maid": return <MaidHomePage />;
    case "driver": return <DriverDashboard />;
    default: return <HouseholdDashboard />;
  }
}

function GroceriesContent() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case "admin": return <AdminShopping />;
    case "maid": return <MaidDashboard />;
    case "driver": return <DriverDashboard />;
    default: return <HouseholdDashboard />;
  }
}

function LogisticsContent() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (!user) return null;
  if (user.role === "maid") {
    setLocation("/");
    return null;
  }
  if (user.role === "driver") return <DriverDashboard />;
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
