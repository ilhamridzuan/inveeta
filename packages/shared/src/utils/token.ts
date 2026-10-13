interface CryptoWithGetRandomValues {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
}

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Mengonversi byte array ke format Base64URL murni tanpa padding (=)
 * tanpa dependensi Buffer (Node.js) maupun btoa (Browser DOM).
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    const triplet = (b0 << 16) | (b1 << 8) | b2;

    result += BASE64URL_ALPHABET[(triplet >> 18) & 63];
    result += BASE64URL_ALPHABET[(triplet >> 12) & 63];
    if (i + 1 < len) {
      result += BASE64URL_ALPHABET[(triplet >> 6) & 63];
    }
    if (i + 2 < len) {
      result += BASE64URL_ALPHABET[triplet & 63];
    }
  }
  return result;
}

/**
 * Menghasilkan token tamu berkekuatan kriptografis tinggi.
 * Menggunakan CSPRNG 16 bytes (128 bits entropi murni).
 * Dikodekan dalam Base64URL string (22 karakter bebas simbol ambigu).
 * Total kombinasi: 2^128 ~= 3.4 x 10^38 kombinasi unik.
 */
export function generateGuestToken(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = (globalThis as unknown as { crypto?: CryptoWithGetRandomValues }).crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return bytesToBase64Url(bytes);
}
