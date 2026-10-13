import { hc } from 'hono/client';
import type { AppType } from '@inveeta/api';
import type {
  PublicEventDTO,
  PersonalizedGuestContextDTO,
  PaginatedWishesDTO,
  SubmitRsvpInput,
  CreateWishInput,
  RsvpResponseDTO,
  WishDTO,
} from '@inveeta/shared';
import React from 'react';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000'
  );
};

export const API_BASE_URL = getApiBaseUrl();

export const honoClient = hc<AppType>(API_BASE_URL);

/**
 * Fetcher data acara dengan deduping React.cache() dan Next.js 15 On-Demand ISR Tags (AGENTS.md & TDD §3.3.B).
 * Menjamin 0 duplikasi HTTP request antara generateMetadata() dan page render.
 */
export const getCachedPublicEvent = React.cache(
  async (slug: string): Promise<PublicEventDTO | null> => {
    const res = await honoClient.api.v1.public.events[':slug'].$get(
      { param: { slug } },
      {
        init: {
          cache: 'force-cache',
          next: {
            tags: [`events-${slug}`, `event-${slug}`],
            revalidate: 3600,
          },
        } as RequestInit,
      }
    );

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(
        `Gagal memuat data undangan (${res.status}): ${res.statusText}`
      );
    }

    const payload = (await res.json()) as {
      success: boolean;
      data: PublicEventDTO;
      error?: { message: string };
    };

    if (!payload.success) {
      throw new Error(payload.error?.message || 'Gagal memuat data acara');
    }

    return payload.data;
  }
);

/**
 * Mengambil konteks personal tamu via GET /api/v1/public/events/:slug/guests/:token (Client Side)
 */
export async function getGuestContext(
  slug: string,
  token: string
): Promise<PersonalizedGuestContextDTO | null> {
  const res = await honoClient.api.v1.public.events[':slug'].guests[':token'].$get({
    param: { slug, token },
  });

  if (!res.ok) {
    return null;
  }

  const payload = (await res.json()) as {
    success: boolean;
    data: PersonalizedGuestContextDTO;
  };

  return payload.success ? payload.data : null;
}

/**
 * Mengirimkan konfirmasi kehadiran tamu via POST /api/v1/public/rsvp
 */
export async function submitRsvp(
  input: SubmitRsvpInput
): Promise<{ success: boolean; data?: RsvpResponseDTO; error?: string }> {
  try {
    const res = await honoClient.api.v1.public.rsvp.$post({
      json: input,
    });

    const payload = (await res.json()) as {
      success: boolean;
      data?: RsvpResponseDTO;
      error?: { message: string };
    };

    if (!res.ok || !payload.success) {
      return {
        success: false,
        error: payload.error?.message || 'Gagal menyimpan konfirmasi kehadiran',
      };
    }

    return { success: true, data: payload.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan jaringan',
    };
  }
}

/**
 * Mengambil daftar ucapan terpaginasi via GET /api/v1/public/wishes/:eventId
 */
export async function fetchWishes(
  eventId: string,
  cursor?: string | null,
  limit = 20
): Promise<PaginatedWishesDTO> {
  const query: { limit: string; cursor?: string } = {
    limit: limit.toString(),
  };
  if (cursor) query.cursor = cursor;

  const res = await honoClient.api.v1.public.wishes[':eventId'].$get({
    param: { eventId },
    query,
  });

  if (!res.ok) {
    return { wishes: [], nextCursor: null, hasMore: false };
  }

  const payload = (await res.json()) as {
    success: boolean;
    data: PaginatedWishesDTO;
  };

  return payload.success
    ? payload.data
    : { wishes: [], nextCursor: null, hasMore: false };
}

/**
 * Mengirim ucapan baru via POST /api/v1/public/wishes
 */
export async function submitWish(
  input: CreateWishInput
): Promise<{ success: boolean; data?: WishDTO; error?: string }> {
  try {
    const res = await honoClient.api.v1.public.wishes.$post({
      json: input,
    });

    const payload = (await res.json()) as {
      success: boolean;
      data?: WishDTO;
      error?: { message: string };
    };

    if (!res.ok || !payload.success) {
      return {
        success: false,
        error: payload.error?.message || 'Gagal mengirim ucapan',
      };
    }

    return { success: true, data: payload.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan jaringan',
    };
  }
}
