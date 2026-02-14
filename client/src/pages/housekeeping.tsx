import { Card, CardContent } from "@/components/ui/card";
import { Home } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/App";

export default function HousekeepingPage() {
  useLang();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Card className="w-full max-w-sm" data-testid="card-housekeeping-placeholder">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Home className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold" data-testid="text-housekeeping-title">{t("nav.housekeeping")}</h2>
            <p className="text-sm text-muted-foreground mt-2" data-testid="text-housekeeping-desc">{t("nav.housekeepingDesc")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
