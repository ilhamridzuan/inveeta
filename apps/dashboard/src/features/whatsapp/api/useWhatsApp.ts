import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { WaTemplateDTO } from '@inveeta/shared';

/**
 * Hook untuk mengambil template pesan WhatsApp acara atau default.
 */
export function useWaTemplateQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: ['events', eventId, 'wa-template'],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<WaTemplateDTO> => {
      if (!eventId) throw new Error('Event ID is required');

      const res = await apiClient.api.v1.manage.events[':id']['wa-template'].$get({
        param: { id: eventId },
      });

      if (!res.ok) {
        throw new Error('Gagal memuat template pesan WhatsApp');
      }

      const json = await res.json();
      return json.data as WaTemplateDTO;
    },
  });
}

/**
 * Hook mutasi untuk memperbarui template pesan WhatsApp kustom Host.
 */
export function useUpdateWaTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      templateText,
    }: {
      eventId: string;
      templateText: string;
    }): Promise<WaTemplateDTO> => {
      const res = await apiClient.api.v1.manage.events[':id']['wa-template'].$put({
        param: { id: eventId },
        json: { templateText },
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errJson.error?.message || 'Gagal menyimpan template WhatsApp');
      }

      const json = await res.json();
      return json.data as WaTemplateDTO;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'wa-template'],
      });
    },
  });
}

/**
 * Helper untuk mengambil tautan wa.me dengan pesan tersubstitusi dari backend.
 */
export async function getGuestWaLink(
  eventId: string,
  guestId: string
): Promise<{ phoneNumber: string; rawMessage: string; encodedUrl: string }> {
  const res = await apiClient.api.v1.manage.events[':id'].guests[':guestId']['wa-link'].$get({
    param: { id: eventId, guestId },
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(errJson.error?.message || 'Gagal membentuk tautan WhatsApp');
  }

  const json = await res.json();
  return json.data;
}
