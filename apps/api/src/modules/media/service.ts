import path from 'node:path';
import {
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db, events, eventMedia, eventGiftDetails } from '@inveeta/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  generateId,
  getTemplate,
  type PresignMediaInput,
  type ConfirmMediaInput,
  type PresignMediaResponseDTO,
  type ConfirmedMediaResponseDTO,
} from '@inveeta/shared';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../../lib/r2.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors.js';

function resolveMediaFolder(mediaType: string): string {
  switch (mediaType) {
    case 'audio':
      return 'audio';
    case 'qris':
      return 'qris';
    case 'og_image':
      return 'og';
    default:
      return 'photos';
  }
}

function resolveFileExtension(fileName: string, mimeType: string): string {
  const parsedExt = path.extname(fileName).toLowerCase();
  if (parsedExt) {
    return parsedExt;
  }

  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/png') return '.png';
  if (mimeType.startsWith('audio')) return '.mp3';
  return '.jpg';
}

export class MediaService {
  /**
   * Menghasilkan Presigned PUT URL Cloudflare R2 dengan batas waktu (TTL) 10 menit.
   * Mengunci Content-Type secara kriptografis (Jebakan 3).
   */
  async generatePresignedPutUrl(
    userId: string,
    input: PresignMediaInput
  ): Promise<PresignMediaResponseDTO> {
    // 1. Verifikasi kepemilikan acara oleh Host
    const [event] = await db
      .select({
        id: events.id,
        hostId: events.hostId,
        templateId: events.templateId,
      })
      .from(events)
      .where(and(eq(events.id, input.eventId), eq(events.hostId, userId)));

    if (!event) {
      throw new ForbiddenError(
        'Anda tidak memiliki izin untuk mengunggah media ke acara ini'
      );
    }

    // 2. Validasi Kuota Foto Template jika mengunggah foto galeri
    if (input.mediaType === 'photo') {
      const template = getTemplate(event.templateId);
      const maxPhotos = template?.maxPhotos ?? 5;

      const [countResult] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(eventMedia)
        .where(
          and(
            eq(eventMedia.eventId, input.eventId),
            eq(eventMedia.mediaType, 'photo')
          )
        );

      if ((countResult?.count ?? 0) >= maxPhotos) {
        throw new BadRequestError(
          'PHOTO_QUOTA_EXCEEDED',
          `Kuota foto template (${maxPhotos} foto) telah tercapai. Hapus foto lama untuk mengunggah foto baru.`
        );
      }
    }

    // 3. Tentukan folder dan ekstensi file
    const folder = resolveMediaFolder(input.mediaType);
    const ext = resolveFileExtension(input.fileName, input.mimeType);

    const uniqueId = generateId(16);
    const fileKey = `events/${input.eventId}/${folder}/${uniqueId}${ext}`;

    // 4. Buat PutObjectCommand dengan ContentType yang terkunci (Jebakan 3)
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: input.mimeType,
    });

    const expiresInSeconds = 600; // 10 menit
    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      uploadUrl,
      fileKey,
      mimeType: input.mimeType,
      expiresInSeconds,
    };
  }

  /**
   * Konfirmasi keberadaan fisik file di Cloudflare R2 via HeadObjectCommand
   * dan mencatat metadata file ke database PostgreSQL.
   */
  async confirmMediaUpload(
    userId: string,
    input: ConfirmMediaInput
  ): Promise<ConfirmedMediaResponseDTO> {
    // 1. Verifikasi kepemilikan acara
    const [event] = await db
      .select({ id: events.id, hostId: events.hostId })
      .from(events)
      .where(and(eq(events.id, input.eventId), eq(events.hostId, userId)));

    if (!event) {
      throw new ForbiddenError(
        'Anda tidak memiliki hak akses untuk memodifikasi acara ini'
      );
    }

    // 2. Verifikasi fisik keberadaan file di Cloudflare R2
    let actualSize = input.fileSize;
    try {
      const head = await r2Client.send(
        new HeadObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: input.fileKey,
        })
      );
      if (head.ContentLength) {
        actualSize = head.ContentLength;
      }
    } catch (err: unknown) {
      console.error('HeadObjectCommand gagal verifikasi file di R2:', err);
      throw new BadRequestError(
        'MEDIA_NOT_FOUND',
        'File fisik belum ditemukan di penyimpanan cloud. Pastikan upload langsung ke uploadUrl telah sukses.'
      );
    }

    const fileUrl = `${R2_PUBLIC_URL}/${input.fileKey}`;

    // 3. Simpan baris rekaman di event_media
    const [mediaRecord] = await db
      .insert(eventMedia)
      .values({
        eventId: input.eventId,
        mediaType: input.mediaType,
        fileKey: input.fileKey,
        fileUrl,
        mimeType: input.mimeType,
        fileSize: actualSize,
        slotIdentifier: input.slotIdentifier || null,
        sortOrder: input.sortOrder || 0,
      })
      .returning();

    // 4. Sinkronisasi otomatis kolom khusus jika slot sesuai
    if (input.mediaType === 'photo' && input.slotIdentifier === 'cover') {
      await db
        .update(events)
        .set({ coverPhotoUrl: fileUrl })
        .where(eq(events.id, input.eventId));
    } else if (input.mediaType === 'audio') {
      await db
        .update(events)
        .set({ bgMusicUrl: fileUrl })
        .where(eq(events.id, input.eventId));
    } else if (input.mediaType === 'og_image') {
      await db
        .update(events)
        .set({ ogImageUrl: fileUrl })
        .where(eq(events.id, input.eventId));
    } else if (input.mediaType === 'qris') {
      await db
        .insert(eventGiftDetails)
        .values({
          eventId: input.eventId,
          qrisImageUrl: fileUrl,
        })
        .onConflictDoUpdate({
          target: eventGiftDetails.eventId,
          set: { qrisImageUrl: fileUrl },
        });
    }

    return {
      id: mediaRecord.id,
      eventId: mediaRecord.eventId,
      fileKey: mediaRecord.fileKey,
      fileUrl: mediaRecord.fileUrl,
      mediaType: mediaRecord.mediaType,
      mimeType: mediaRecord.mimeType,
      fileSize: mediaRecord.fileSize,
      slotIdentifier: mediaRecord.slotIdentifier,
      sortOrder: mediaRecord.sortOrder,
    };
  }

  /**
   * Menghapus file fisik di Cloudflare R2 dan menghapus baris rekaman di database.
   */
  async deleteMedia(
    userId: string,
    mediaId: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Cari file media & hubungkan dengan acara pemilik
    const [record] = await db
      .select({
        id: eventMedia.id,
        eventId: eventMedia.eventId,
        fileKey: eventMedia.fileKey,
        fileUrl: eventMedia.fileUrl,
        mediaType: eventMedia.mediaType,
        hostId: events.hostId,
      })
      .from(eventMedia)
      .innerJoin(events, eq(eventMedia.eventId, events.id))
      .where(eq(eventMedia.id, mediaId));

    if (!record) {
      throw new NotFoundError('Data media tidak ditemukan');
    }

    if (record.hostId !== userId) {
      throw new ForbiddenError(
        'Anda tidak memiliki hak akses untuk menghapus media ini'
      );
    }

    // 2. Hapus file fisik di R2
    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: record.fileKey,
        })
      );
    } catch (err) {
      console.warn('Gagal menghapus file fisik di R2 (mungkin sudah terhapus):', err);
    }

    // 3. Hapus baris dari database
    await db.delete(eventMedia).where(eq(eventMedia.id, mediaId));

    return {
      success: true,
      message: 'Media berhasil dihapus',
    };
  }
}

export const mediaService = new MediaService();
