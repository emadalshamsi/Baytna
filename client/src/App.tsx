import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, LogOut, Moon, Sun, Shield, User as UserIcon, Truck, HandPlatter } from "lucide-react";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";
import LoginPage from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import MaidDashboard from "@/pages/maid-dashboard";
import DriverDashboard from "@/pages/driver-dashboard";
import HouseholdDashboard from "@/pages/household-dashboard";
import NotFound from "@/pages/not-found";

const LangContext = createContext<{ lang: Lang; toggleLang: () => void }>({ lang: "ar", toggleLang: () => {} });
export function useLang() { return useContext(LangContext); }

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);
  const toggle = () => {
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
    <Button size="icon" variant="ghost" onClick={toggle} data-testid="button-theme-toggle">
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function LangToggle() {
  const { lang, toggleLang } = useLang();
  return (
    <Button size="sm" variant="ghost" onClick={toggleLang} data-testid="button-lang-toggle" className="text-xs">
      {lang === "ar" ? "EN" : "عربي"}
    </Button>
  );
}

function getRoleIcon(role: string) {
  switch (role) {
    case "admin": return Shield;
    case "maid": return HandPlatter;
    case "driver": return Truck;
    default: return UserIcon;
  }
}

function AppLayout() {
  const { user, isLoading, logout } = useAuth();

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

  const RoleIcon = getRoleIcon(user.role);

  const renderDashboard = () => {
    switch (user.role) {
      case "admin": return <AdminDashboard />;
      case "maid": return <MaidDashboard />;
      case "driver": return <DriverDashboard />;
      default: return <HouseholdDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 p-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight" data-testid="text-header-title">{t("app.name")}</h1>
              <div className="flex items-center gap-1">
                <RoleIcon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{t(`roles.${user.role}`)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 p-1" data-testid="button-user-menu">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs">{(user.firstName?.[0] || user.username?.[0] || "U").toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                  <span className="font-medium text-sm">{user.firstName || user.username}</span>
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">{t(`roles.${user.role}`)}</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="gap-2 text-destructive" data-testid="button-logout">
                  <LogOut className="w-4 h-4" /> {t("actions.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3">
        <Switch>
          <Route path="/" component={() => renderDashboard()} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  const [lang, setLangState] = useState<Lang>(getLang());

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
