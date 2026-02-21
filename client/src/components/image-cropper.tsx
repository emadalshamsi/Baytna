import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";
import { t } from "@/lib/i18n";

function getCroppedCanvas(image: HTMLImageElement, crop: PixelCrop): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas;
}

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropDone: (croppedBlob: Blob) => void;
}

export function ImageCropper({ open, imageSrc, onClose, onCropDone }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const cropSize = Math.min(width, height) * 0.8;
    const x = (width - cropSize) / 2;
    const y = (height - cropSize) / 2;
    setCrop({ unit: "px", x, y, width: cropSize, height: cropSize });
  }, []);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    setProcessing(true);
    try {
      const canvas = getCroppedCanvas(imgRef.current, completedCrop);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Canvas is empty"));
        }, "image/jpeg", 0.9);
      });
      onCropDone(blob);
    } catch {
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    const cropSize = Math.min(width, height) * 0.8;
    const x = (width - cropSize) / 2;
    const y = (height - cropSize) / 2;
    setCrop({ unit: "px", x, y, width: cropSize, height: cropSize });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{t("fields.cropImage")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center overflow-auto bg-muted/50 p-2" style={{ maxHeight: "65vh" }}>
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            keepSelection
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt=""
              onLoad={onImageLoad}
              style={{ maxHeight: "60vh", maxWidth: "100%" }}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleReset} data-testid="button-crop-reset">
              <RotateCcw className="w-4 h-4" /> {t("actions.reset")}
            </Button>
            <Button className="flex-1 gap-2" onClick={handleConfirm} disabled={processing || !completedCrop} data-testid="button-crop-confirm">
              <Check className="w-4 h-4" /> {t("actions.confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
