import imageCompression from "browser-image-compression";

export async function compressImage(file: File): Promise<File> {
  if (file.size <= 100 * 1024) {
    return file;
  }
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      initialQuality: 0.8,
    });
    return compressed;
  } catch {
    return file;
  }
}
