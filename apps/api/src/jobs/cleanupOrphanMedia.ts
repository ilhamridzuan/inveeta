import { fileURLToPath } from 'node:url';
import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type _Object,
} from '@aws-sdk/client-s3';
import { db, eventMedia } from '@inveeta/db';
import { inArray } from 'drizzle-orm';
import { r2Client, R2_BUCKET_NAME } from '../lib/r2.js';

async function fetchAllEventsObjects(
  token?: string
): Promise<_Object[]> {
  const listCommand = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: 'events/',
    ContinuationToken: token,
  });

  const listResult = await r2Client.send(listCommand);
  const currentObjects = listResult.Contents || [];

  if (!listResult.NextContinuationToken) {
    return currentObjects;
  }

  const nextObjects = await fetchAllEventsObjects(
    listResult.NextContinuationToken
  );
  return [...currentObjects, ...nextObjects];
}

async function batchDeleteKeys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  const chunkSize = 1000;
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += chunkSize) {
    chunks.push(keys.slice(i, i + chunkSize));
  }

  const deletePromises = chunks.map((chunk) =>
    r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
          Quiet: true,
        },
      })
    )
  );

  await Promise.all(deletePromises);
  return keys.length;
}

export async function cleanupOrphanMedia(): Promise<{
  checkedCount: number;
  deletedCount: number;
}> {
  console.log('[Cleanup Orphan Media] Memulai pemindaian file yatim di R2...');

  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 jam yang lalu

  try {
    const allObjects = await fetchAllEventsObjects();
    const checkedCount = allObjects.length;

    // Filter kandidat yang berumur lebih dari 24 jam
    const candidateKeys = allObjects
      .filter((obj) => obj.Key && (!obj.LastModified || obj.LastModified <= cutoffTime))
      .map((obj) => obj.Key as string);

    if (candidateKeys.length === 0) {
      console.log(
        `[Cleanup Orphan Media] Selesai: ${checkedCount} file diperiksa, 0 file yatim dihapus.`
      );
      return { checkedCount, deletedCount: 0 };
    }

    // Query database secara batch untuk mencari fileKey yang terdaftar
    const existingRecords = await db
      .select({ fileKey: eventMedia.fileKey })
      .from(eventMedia)
      .where(inArray(eventMedia.fileKey, candidateKeys));

    const existingKeySet = new Set(existingRecords.map((r) => r.fileKey));
    const orphanKeys = candidateKeys.filter((key) => !existingKeySet.has(key));

    const deletedCount = await batchDeleteKeys(orphanKeys);

    console.log(
      `[Cleanup Orphan Media] Selesai: ${checkedCount} file diperiksa, ${deletedCount} file yatim dihapus.`
    );

    return { checkedCount, deletedCount };
  } catch (error) {
    console.error('[Cleanup Orphan Media Error]:', error);
    throw error;
  }
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
