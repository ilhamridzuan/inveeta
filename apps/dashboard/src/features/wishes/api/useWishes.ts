import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedManageWishesDTO, ManageWishItemDTO } from '@inveeta/shared';

export interface WishFilters {
  status?: 'all' | 'visible' | 'hidden';
  page?: number;
  limit?: number;
}

/**
 * Hook untuk mengambil daftar ucapan tamu terpaginasi untuk Host (termasuk ucapan tersembunyi).
 */
export function useManageWishesQuery(
  eventId: string | undefined,
  filters: WishFilters = {}
) {
  return useQuery({
    queryKey: ['events', eventId, 'wishes', filters],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<PaginatedManageWishesDTO> => {
      if (!eventId) throw new Error('Event ID is required');

      const queryParams: Record<string, string> = {};
      if (filters.status && filters.status !== 'all') {
        queryParams.status = filters.status;
      }
      if (filters.page) queryParams.page = String(filters.page);
      if (filters.limit) queryParams.limit = String(filters.limit);

      const res = await apiClient.api.v1.manage.events[':id'].wishes.manage.$get({
        param: { id: eventId },
        query: queryParams as unknown as {
          status?: 'all' | 'visible' | 'hidden';
          page?: string;
          limit?: string;
        },
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errJson.error?.message || 'Gagal memuat daftar ucapan');
      }

      const json = await res.json();
      return json.data as PaginatedManageWishesDTO;
    },
  });
}

/**
 * Hook mutasi untuk toggle visibilitas ucapan (Soft Moderation).
 */
export function useToggleWishVisibilityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      wishId,
      isHidden,
    }: {
      eventId: string;
      wishId: string;
      isHidden: boolean;
    }): Promise<ManageWishItemDTO> => {
      const res = await apiClient.api.v1.manage.events[':id'].wishes[':wishId'].visibility.$patch({
        param: { id: eventId, wishId },
        json: { isHidden },
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errJson.error?.message || 'Gagal mengubah visibilitas ucapan');
      }

      const json = await res.json();
      return json.data as ManageWishItemDTO;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'wishes'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'metrics'],
      });
    },
  });
}

/**
 * Hook mutasi untuk menghapus permanen ucapan dari database (Hard Delete).
 */
export function useDeleteWishMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      wishId,
    }: {
      eventId: string;
      wishId: string;
    }): Promise<{ id: string; deleted: boolean }> => {
      const res = await apiClient.api.v1.manage.events[':id'].wishes[':wishId'].$delete({
        param: { id: eventId, wishId },
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errJson.error?.message || 'Gagal menghapus ucapan');
      }

      const json = await res.json();
      return json.data as { id: string; deleted: boolean };
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'wishes'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'metrics'],
      });
    },
  });
}
