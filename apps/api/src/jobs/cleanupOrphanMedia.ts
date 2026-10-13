import { fileURLToPath } from 'node:url';
import {
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { db, eventMedia } from '@inveeta/db';
import { eq } from 'drizzle-orm';
import { r2Client, R2_BUCKET_NAME } from '../lib/r2.js';

export async function cleanupOrphanMedia(): Promise<{
  checkedCount: number;
  deletedCount: number;
}> {
  console.log('[Cleanup Orphan Media] Memulai pemindaian file yatim di R2...');

  let continuationToken: string | undefined;
  let checkedCount = 0;
  let deletedCount = 0;
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 jam yang lalu

  try {
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: 'events/',
        ContinuationToken: continuationToken,
      });

      const listResult = await r2Client.send(listCommand);
      const objects = listResult.Contents || [];

      for (const obj of objects) {
        if (!obj.Key) continue;
        checkedCount++;

        // Jika file berumur kurang dari 24 jam, biarkan (mungkin sedang proses upload/confirm)
        if (obj.LastModified && obj.LastModified > cutoffTime) {
          continue;
        }

        // Cek apakah key terdaftar di tabel event_media
        const [existing] = await db
          .select({ id: eventMedia.id })
          .from(eventMedia)
          .where(eq(eventMedia.fileKey, obj.Key))
          .limit(1);

        if (!existing) {
          console.log(`[Cleanup] Menghapus file yatim di R2: ${obj.Key}`);
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: obj.Key,
            })
          );
          deletedCount++;
        }
      }

      continuationToken = listResult.NextContinuationToken;
    } while (continuationToken);

    console.log(
      `[Cleanup Orphan Media] Selesai: ${checkedCount} file diperiksa, ${deletedCount} file yatim dihapus.`
    );
  } catch (error) {
    console.error('[Cleanup Orphan Media Error]:', error);
    throw error;
  }

  return { checkedCount, deletedCount };
}

// Eksekusi jika dijalankan secara langsung via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await cleanupOrphanMedia();
    process.exit(0);
  } catch {
    process.exit(1);
  }
}
