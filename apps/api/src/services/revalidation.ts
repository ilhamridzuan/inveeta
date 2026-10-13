/**
 * Service untuk memicu Webhook On-Demand Revalidation Next.js 15 ISR
 * Menggunakan shared secret REVALIDATION_SECRET dan retry 3x exponential backoff
 */

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeRevalidationAttempt(
  url: string,
  secret: string,
  tag: string,
  attemptNumber: number
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ tag }),
    });

    if (response.ok) {
      console.log(
        `[Revalidation] Berhasil revalidasi cache Next.js untuk tag '${tag}'.`
      );
      return true;
    }

    console.warn(
      `[Revalidation] Percobaan ke-${attemptNumber} gagal dengan status HTTP ${response.status}: ${response.statusText}`
    );
  } catch (error) {
    console.warn(
      `[Revalidation] Percobaan ke-${attemptNumber} gagal terhubung ke Next.js webhook:`,
      error instanceof Error ? error.message : error
    );
  }

  // Jika belum mencapai batas maksimal 3 percobaan, lakukan backoff retry
  if (attemptNumber < 3) {
    const backoffMs = 500 * Math.pow(2, attemptNumber - 1); // 500ms, 1000ms
    await delay(backoffMs);
    return executeRevalidationAttempt(url, secret, tag, attemptNumber + 1);
  }

  console.error(
    `[Revalidation] Seluruh 3 percobaan revalidasi gagal untuk tag '${tag}'.`
  );
  return false;
}

export async function triggerNextRevalidate(slug: string): Promise<boolean> {
  const secret = process.env.REVALIDATION_SECRET || '';
  const rawBaseUrl = process.env.INVITATION_APP_URL || 'http://localhost:3001';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
  const url = `${baseUrl}/api/revalidate`;
  const tag = `events-${slug}`;

  if (!secret) {
    console.warn(
      '[Revalidation] REVALIDATION_SECRET belum dikonfigurasi di environment. Revalidasi dilewati.'
    );
    return false;
  }

  return executeRevalidationAttempt(url, secret, tag, 1);
}
