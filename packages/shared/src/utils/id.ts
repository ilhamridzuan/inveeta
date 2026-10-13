const NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZ_bfghjklqvwyz';

interface CryptoWithGetRandomValues {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
}

/**
 * Mengambil byte acak dengan fallback aman tanpa ketergantungan runtime khusus.
 */
function getRandomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  const cryptoObj = (globalThis as unknown as { crypto?: CryptoWithGetRandomValues }).crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Generator ID collision-resistant seragam (berbasis nanoid).
 * Implementasi TypeScript murni tanpa dependensi eksternal, kompatibel lintas runtime (Node, Browser, Edge).
 */
export function generateId(size = 21): string {
  const bytes = getRandomBytes(size);
  let id = '';
  const len = NANOID_ALPHABET.length;
  for (let i = 0; i < size; i++) {
    id += NANOID_ALPHABET[bytes[i] % len];
  }
  return id;
}
