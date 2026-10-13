/**
 * mediaUpload.ts
 * Service pengunggahan file media R2 dengan presigned PUT URL
 * Mematuhi Protokol Jebakan 3 (Presigned PUT Content-Type Lock)
 * Disertai Smart Fallback ke direct upload API jika browser terhalang CORS R2 di local dev.
 */

import { apiClient } from '@/lib/api-client';
import type { PresignMediaResponseDTO, ConfirmedMediaResponseDTO } from '@inveeta/shared';

export interface UploadMediaParams {
  eventId: string;
  blobOrFile: Blob | File;
  fileName: string;
  mediaType: 'photo' | 'audio' | 'qris' | 'og_image';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'audio/mpeg' | 'audio/mp4' | 'audio/x-m4a';
  slotIdentifier?: string;
  sortOrder?: number;
}

export interface UploadMediaResult {
  mediaId: string;
  publicUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  slotIdentifier?: string | null;
}

/**
 * Mengunggah file media ke Cloudflare R2 melalui:
 * 1. Jalur Utama: 3-tahap Presigned Flow (presign -> PUT R2 -> confirm) dengan Content-Type lock
 * 2. Smart Fallback: Jika PUT R2 diblokir oleh kebijakan CORS browser di localhost,
 *    otomatis beralih ke server-side direct upload via API backend.
 */
export async function uploadMediaFile(
  params: UploadMediaParams
): Promise<UploadMediaResult> {
  const {
    eventId,
    blobOrFile,
    fileName,
    mediaType,
    mimeType,
    slotIdentifier,
    sortOrder = 0,
  } = params;

  if (!eventId) {
    throw new Error('ID acara wajib ada sebelum mengunggah media');
  }

  const fileSize = blobOrFile.size;

  // 1. Dapatkan Presigned PUT URL dari Backend API
  const presignRes = await apiClient.api.v1.manage.media.presign.$post({
    json: {
      eventId,
      fileName,
      mediaType,
      mimeType,
      fileSize,
      slotIdentifier,
    },
  });

  if (!presignRes.ok) {
    const errorJson = (await presignRes.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      errorJson?.error?.message ||
        `Gagal mendapatkan presigned URL (Status: ${presignRes.status})`
    );
  }

  const presignData = (await presignRes.json()) as {
    success: boolean;
    data: PresignMediaResponseDTO;
  };
  const { uploadUrl, fileKey, mimeType: lockedMimeType } = presignData.data;

  // 2. Coba upload langsung via Presigned PUT (Jebakan 3: Content-Type identik mutlak)
  try {
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': lockedMimeType,
      },
      body: blobOrFile,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Upload PUT R2 menghasilkan status ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    // 3. Konfirmasi media upload ke backend untuk mencatat ke database
    const confirmRes = await apiClient.api.v1.manage.media.confirm.$post({
      json: {
        eventId,
        fileKey,
        mediaType,
        mimeType: lockedMimeType,
        fileSize,
        slotIdentifier,
        sortOrder,
      },
    });

    if (!confirmRes.ok) {
      const errorJson = (await confirmRes.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(
        errorJson?.error?.message ||
          `Gagal mengonfirmasi upload media (Status: ${confirmRes.status})`
      );
    }

    const confirmData = (await confirmRes.json()) as {
      success: boolean;
      data: ConfirmedMediaResponseDTO;
    };

    return {
      mediaId: confirmData.data.id,
      publicUrl: confirmData.data.fileUrl,
      fileKey: confirmData.data.fileKey,
      fileSize: confirmData.data.fileSize,
      mimeType: confirmData.data.mimeType,
      slotIdentifier: confirmData.data.slotIdentifier,
    };
  } catch (directPutErr) {
    console.warn(
      '[mediaUpload] Presigned PUT R2 terhalang di browser (biasanya CORS preflight R2 di local). Menggunakan jalur fallback API upload-direct...',
      directPutErr
    );

    // Fallback: Kirim melalui server-side proxy upload ke Cloudflare R2
    const formData = new FormData();
    const filePayload =
      blobOrFile instanceof File
        ? blobOrFile
        : new File([blobOrFile], fileName, { type: mimeType });

    formData.append('file', filePayload);
    formData.append('eventId', eventId);
    formData.append('mediaType', mediaType);
    if (slotIdentifier) formData.append('slotIdentifier', slotIdentifier);
    formData.append('sortOrder', String(sortOrder));

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const fallbackRes = await fetch(`${apiUrl}/api/v1/manage/media/upload-direct`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!fallbackRes.ok) {
      const errJson = (await fallbackRes.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(
        errJson?.error?.message ||
          `Gagal mengunggah file media (Status: ${fallbackRes.status})`
      );
    }

    const fallbackData = (await fallbackRes.json()) as {
      success: boolean;
      data: ConfirmedMediaResponseDTO;
    };

    return {
      mediaId: fallbackData.data.id,
      publicUrl: fallbackData.data.fileUrl,
      fileKey: fallbackData.data.fileKey,
      fileSize: fallbackData.data.fileSize,
      mimeType: fallbackData.data.mimeType,
      slotIdentifier: fallbackData.data.slotIdentifier,
    };
  }
}
