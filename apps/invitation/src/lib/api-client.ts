import { hc } from 'hono/client';
import type { AppType } from '@inveeta/api';
import type { PublicEventDTO } from '@inveeta/shared';
import React from 'react';

const API_BASE_URL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

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
