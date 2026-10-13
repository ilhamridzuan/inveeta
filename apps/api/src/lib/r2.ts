import { S3Client } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'inveeta-storage';
export const R2_PUBLIC_URL = (
  process.env.R2_PUBLIC_URL ||
  'https://pub-292367d7308b411cac0dd9d8bfcdc2b6.r2.dev'
).replace(/\/+$/, '');

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
