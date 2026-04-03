/**
 * Compress an image file for upload.
 *
 * - Resizes to fit within maxDimension (default 1600px)
 * - Converts to JPEG at given quality (default 0.82)
 * - Only compresses if file is an image and exceeds minSize (default 200KB)
 * - Returns original file unchanged for non-images or small files
 */
export async function compressImage(
  file: File | Blob,
  options?: {
    maxDimension?: number;
    quality?: number;
    minSize?: number;
  },
): Promise<File | Blob> {
  const maxDim = options?.maxDimension ?? 1600;
  const quality = options?.quality ?? 0.82;
  const minSize = options?.minSize ?? 200_000;

  // Skip non-images
  const type = file instanceof File ? file.type : (file as Blob).type;
  if (!type?.startsWith("image/")) return file;

  // Skip small files
  if (file.size <= minSize) return file;

  // Skip SVGs (vector, no point compressing)
  if (type === "image/svg+xml") return file;

  const img = new Image();
  const url = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });

    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", quality),
    );

    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
