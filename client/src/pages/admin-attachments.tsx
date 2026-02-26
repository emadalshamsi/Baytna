import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, FileDown } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/App";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  total: number;
}

export default function AdminAttachments() {
  useLang();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    try {
      const res = await fetch("/api/products/template", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t("attachments.importFailed"), variant: "destructive" });
    }
  };

  const exportProducts = async () => {
    try {
      const res = await fetch("/api/products/export", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products_export.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t("attachments.exportFailed"), variant: "destructive" });
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast({ title: t("attachments.invalidFile"), variant: "destructive" });
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Import failed");
      }
      const data: ImportResult = await res.json();
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      if (data.imported > 0 || data.updated > 0) {
        toast({ title: t("attachments.importSuccess") });
      }
    } catch (err: any) {
      toast({ title: err.message || t("attachments.importFailed"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="font-bold text-sm">{t("nav.products")} - Excel</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={downloadTemplate}
              data-testid="button-download-template"
            >
              <Download className="w-4 h-4" />
              {t("attachments.downloadTemplate")}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={exportProducts}
              data-testid="button-export-products"
            >
              <FileDown className="w-4 h-4" />
              {t("attachments.exportProducts")}
            </Button>
          </div>

          <div className="border-t pt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              data-testid="dropzone-excel"
            >
              {uploading ? (
                <div className="space-y-2">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-muted-foreground">{t("attachments.processing")}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">{t("attachments.selectFile")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("attachments.dragDrop")}</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-excel-file"
            />
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card data-testid="card-import-result">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {t("attachments.importReport")}
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setResult(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.imported}</p>
                <p className="text-xs text-muted-foreground">{t("attachments.newProducts")}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.updated}</p>
                <p className="text-xs text-muted-foreground">{t("attachments.existingUpdated")}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">{t("attachments.errors")}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-3">
                <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  {t("attachments.errorDetails")}
                </p>
                <ul className="text-xs text-destructive/80 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
