import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Home, LogIn, UserPlus, Eye, EyeOff, Moon, Sun, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/i18n";
import { useLang } from "@/App";

export default function LoginPage() {
  const { lang, toggleLang } = useLang();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: t("auth.fillFields"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: any = { username, password };
      if (mode === "register") {
        body.firstName = firstName || undefined;
        body.lastName = lastName || undefined;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.message || "Error", variant: "destructive" });
        return;
      }

      queryClient.setQueryData(["/api/auth/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (error) {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed top-3 start-3 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-md px-3 py-1.5 border" data-testid="lang-toggle-container">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className={`text-xs font-medium ${lang === "ar" ? "font-bold" : "text-muted-foreground"}`}>عربي</span>
          <Switch
            checked={lang === "en"}
            onCheckedChange={toggleLang}
            data-testid="switch-lang-toggle"
          />
          <span className={`text-xs font-medium ${lang === "en" ? "font-bold" : "text-muted-foreground"}`}>EN</span>
        </div>
        <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center">
              <Home className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-app-name">{t("app.name")}</h1>
              <p className="text-sm text-muted-foreground">{t("app.subtitle")}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <Input
              placeholder={t("auth.username")}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              data-testid="input-username"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.password")}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                data-testid="input-password"
              />
              <button
                type="button"
                className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {mode === "register" && (
              <>
                <Input
                  placeholder={`${t("auth.firstName")} (${lang === "ar" ? "اختياري" : "optional"})`}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  data-testid="input-first-name"
                />
                <Input
                  placeholder={`${t("auth.lastName")} (${lang === "ar" ? "اختياري" : "optional"})`}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  data-testid="input-last-name"
                />
              </>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-submit-auth">
              {mode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {loading ? t("auth.loading") : mode === "login" ? t("auth.login") : t("auth.register")}
            </Button>
          </form>

          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            data-testid="button-switch-auth-mode"
          >
            {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            {t("auth.firstUserAdmin")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
