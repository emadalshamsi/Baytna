import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center">
              <Home className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-app-name">بيتكم</h1>
              <p className="text-sm text-muted-foreground">إدارة المنزل</p>
            </div>
          </div>
          <p className="text-center text-muted-foreground text-sm">
            سجّل دخولك لإدارة مشتريات ومهام المنزل
          </p>
          <Button
            className="w-full gap-2"
            onClick={() => { window.location.href = "/api/login"; }}
            data-testid="button-login"
          >
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
