import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import AdminUsers from "@/pages/admin-users";

function ThemeToggleCard() {
  const { lang } = useLang();
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={toggle} data-testid="card-theme-toggle">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {dark ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
          </div>
          <span className="text-sm font-medium">{dark ? (lang === "ar" ? "الوضع الداكن" : "Dark Mode") : (lang === "ar" ? "الوضع الفاتح" : "Light Mode")}</span>
        </div>
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
          {dark ? (lang === "ar" ? "مفعّل" : "On") : (lang === "ar" ? "معطّل" : "Off")}
        </Badge>
      </CardContent>
    </Card>
  );
}

function LangToggleCard() {
  const { lang, toggleLang } = useLang();

  return (
    <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={toggleLang} data-testid="card-lang-toggle">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-muted-foreground">{lang === "ar" ? "EN" : "ع"}</span>
          </div>
          <span className="text-sm font-medium">{lang === "ar" ? "اللغة" : "Language"}</span>
        </div>
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
          {lang === "ar" ? "العربية" : "English"}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  useLang();
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card data-testid="card-profile">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="text-lg font-bold">{(user.firstName?.[0] || user.username?.[0] || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold truncate" data-testid="text-profile-name">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs" data-testid="badge-profile-role">
                  {t(`roles.${user.role}`)}
                </Badge>
                {user.canApprove && (
                  <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs">
                    {t("admin.approvePermission")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <ThemeToggleCard />
        <LangToggleCard />
      </div>

      <Button variant="destructive" className="w-full gap-2" onClick={logout} data-testid="button-logout">
        <LogOut className="w-4 h-4" />
        {t("actions.logout")}
      </Button>

      {user.role === "admin" && (
        <div className="mt-6">
          <AdminUsers />
        </div>
      )}
    </div>
  );
}
