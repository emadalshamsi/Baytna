import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, ShoppingCart, Truck, Sparkles, Settings, Moon, Sun } from "lucide-react";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { Switch as SwitchUI } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";
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
  { key: "housekeeping", path: "/housekeeping", icon: Sparkles, labelKey: "nav.housekeeping", hideFor: [] as string[] },
  { key: "settings", path: "/settings", icon: Settings, labelKey: "nav.settings", hideFor: [] as string[] },
];

function BottomNavBar() {
  useLang();
  const [location] = useLocation();
  const { user } = useAuth();
  const role = user?.role || "";

  const navItems = allNavItems.filter(item => !item.hideFor.includes(role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom" data-testid="bottom-nav">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
          const Icon = item.icon;
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
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  isActive ? "bg-primary/10" : ""
                }`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
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

function AppHeader() {
  const { lang, toggleLang } = useLang();
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

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

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm safe-area-top">
      <div className="flex items-center justify-between p-3">
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
        <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-header">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}

function MainLayout() {
  useLang();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
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
