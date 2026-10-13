export const SYSTEM_LIMITS = {
  // Kuota Media Storage Cloudflare R2
  MEDIA: {
    MAX_PHOTO_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB
    MAX_AUDIO_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
    MAX_QRIS_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB
    ALLOWED_PHOTO_MIMES: ['image/jpeg', 'image/png', 'image/webp'] as const,
    ALLOWED_AUDIO_MIMES: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'] as const,
    PRESIGNED_URL_TTL_SECONDS: 600, // 10 Menit
  },
  // Kuota Tamu & RSVP
  GUESTS: {
    DEFAULT_MAX_PAX: 2,
    ABSOLUTE_MAX_PAX: 20,
    TOKEN_ENTROPY_BYTES: 16, // 128-bit entropi
    TOKEN_LENGTH_CHARS: 22, // Base64URL
  },
  // Rate Limiting Anti-Spam Buku Ucapan
  WISHES: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 50,
    MIN_MESSAGE_LENGTH: 5,
    MAX_MESSAGE_LENGTH: 500,
    COOLDOWN_PER_IP_SECONDS: 30,
    MAX_PER_10_MINUTES: 5,
  },
} as const;
