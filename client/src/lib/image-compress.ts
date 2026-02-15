import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: "image/webp" as const,
  initialQuality: 0.8,
};

export async function compressImage(file: File): Promise<File> {
  if (file.size <= 100 * 1024) {
    return file;
  }
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  return compressed;
}
