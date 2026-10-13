/**
 * imageCompressor.ts
 * Utilitas kompresi gambar berbasis HTML5 Canvas untuk apps/dashboard
 * Sesuai TDD §9.3.B & Jebakan 3:
 * - Resize otomatis ke lebar maksimal 1920px (menjaga aspect ratio)
 * - Konversi format ke 'image/webp' dengan kualitas 85% (target <= 600 KB)
 * - Menghasilkan Blob dan mimeType 'image/webp' secara eksplisit
 */

export interface CompressImageOptions {
  maxWidth?: number;
  quality?: number;
}

export interface CompressedImageResult {
  blob: Blob;
  file: File;
  mimeType: 'image/webp';
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  previewUrl: string;
  originalSize: number;
  compressionRatio: number;
}

/**
 * Mengubah nama file dengan ekstensi .webp
 */
function toWebpFileName(originalName: string): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  return `${baseName}.webp`;
}

/**
 * Mengompresi file gambar di browser menggunakan Canvas API sebelum proses upload presigned R2.
 */
export async function compressImage(
  inputFile: File,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const maxWidth = options.maxWidth ?? 1920;
  const quality = options.quality ?? 0.85;

  return new Promise((resolve, reject) => {
    // Validasi tipe file input
    if (!inputFile.type.startsWith('image/')) {
      return reject(new Error('File yang dipilih bukan merupakan format gambar'));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(inputFile);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Hitung dimensi baru proporsional jika lebar melebihi batas maksimum
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Gagal menginisialisasi 2D Canvas context'));
      }

      // Gambar foto dengan konfigurasi smoothing tinggi
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Konversi ke format WebP berkualitas 85%
      const targetMimeType: 'image/webp' = 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Gagal menghasilkan WebP blob dari Canvas'));
          }

          const webpName = toWebpFileName(inputFile.name);
          const compressedFile = new File([blob], webpName, {
            type: targetMimeType,
            lastModified: Date.now(),
          });

          const previewUrl = URL.createObjectURL(blob);
          const originalSize = inputFile.size;
          const fileSize = blob.size;
          const compressionRatio = Math.round(
            ((originalSize - fileSize) / originalSize) * 100
          );

          resolve({
            blob,
            file: compressedFile,
            mimeType: targetMimeType,
            fileName: webpName,
            fileSize,
            width,
            height,
            previewUrl,
            originalSize,
            compressionRatio,
          });
        },
        targetMimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal memuat gambar untuk proses kompresi'));
    };

    img.src = objectUrl;
  });
}
