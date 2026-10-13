/**
 * mediaUpload.ts
 * Service pengunggahan file media R2 dengan presigned PUT URL
 * Mematuhi Protokol Jebakan 3 (Presigned PUT Content-Type Lock)
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
 * Mengunggah file media ke Cloudflare R2 melalui 3-tahap Presigned Flow:
 * 1. Minta Presigned URL dari backend: POST /api/v1/manage/media/presign
 * 2. Upload file via PUT langsung ke R2 dengan header Content-Type identik mutlak
 * 3. Konfirmasi upload ke backend: POST /api/v1/manage/media/confirm
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

  // 2. Upload langsung ke Cloudflare R2 via HTTP PUT (Jebakan 3: Content-Type Lock)
  // Headers Content-Type WAJIB identik mutlak dengan yang didaftarkan saat presign!
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': lockedMimeType,
    },
    body: blobOrFile,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Gagal mengunggah file ke R2 storage (Status: ${uploadResponse.status} ${uploadResponse.statusText})`
    );
  }

  // 3. Konfirmasi media upload ke backend untuk menyimpan entitas ke database
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
}
