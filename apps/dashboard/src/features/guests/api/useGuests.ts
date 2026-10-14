import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  CreateGuestInput,
  UpdateGuestInput,
  ManualOverrideRsvpInput,
  PaginatedGuestsDTO,
  ManageGuestItemDTO,
} from '@inveeta/shared';

export interface GuestFilters {
  search?: string;
  category?: string;
  rsvpStatus?: 'attending' | 'declined' | 'pending';
  page?: number;
  limit?: number;
}

export interface EventSessionItem {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  locationName: string;
  address: string;
}

/**
 * Hook untuk mengambil daftar tamu terpaginasi dengan auto-caching dan filter dinamis.
 */
export function useGuestsQuery(eventId: string | undefined, filters: GuestFilters = {}) {
  return useQuery({
    queryKey: ['events', eventId, 'guests', filters],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<PaginatedGuestsDTO> => {
      if (!eventId) throw new Error('Event ID is required');

      const queryParams: Record<string, string> = {};
      if (filters.search?.trim()) queryParams.search = filters.search.trim();
      if (filters.category && filters.category !== 'all') queryParams.category = filters.category;
      if (filters.rsvpStatus) queryParams.rsvpStatus = filters.rsvpStatus;
      if (filters.page) queryParams.page = String(filters.page);
      if (filters.limit) queryParams.limit = String(filters.limit);

      const res = await apiClient.api.v1.manage.events[':id'].guests.$get({
        param: { id: eventId },
        query: queryParams as unknown as {
          search?: string;
          category?: string;
          rsvpStatus?: 'attending' | 'declined' | 'pending';
          page?: string;
          limit?: string;
        },
      });

      if (!res.ok) {
        const errorJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errorJson.error?.message || 'Gagal memuat daftar tamu');
      }

      const json = await res.json();
      return json.data as PaginatedGuestsDTO;
    },
  });
}

/**
 * Hook untuk mengambil detail acara Host (termasuk daftar sesi untuk alokasi tamu).
 */
export function useEventDetailQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: ['events', eventId, 'detail'],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');

      const res = await apiClient.api.v1.manage.events[':id'].$get({
        param: { id: eventId },
      });

      if (!res.ok) {
        throw new Error('Gagal memuat detail acara');
      }

      const json = await res.json();
      return json.data;
    },
  });
}

/**
 * Hook mutasi untuk menambah tamu baru.
 */
export function useCreateGuestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      input,
    }: {
      eventId: string;
      input: CreateGuestInput;
    }): Promise<ManageGuestItemDTO> => {
      const res = await apiClient.api.v1.manage.events[':id'].guests.$post({
        param: { id: eventId },
        json: input,
      });

      if (!res.ok) {
        const errorJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errorJson.error?.message || 'Gagal menambahkan tamu baru');
      }

      const json = await res.json();
      return json.data as ManageGuestItemDTO;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'guests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'metrics'],
      });
    },
  });
}

/**
 * Hook mutasi untuk memperbarui data tamu & alokasi sesi.
 */
export function useUpdateGuestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      guestId,
      input,
    }: {
      eventId: string;
      guestId: string;
      input: UpdateGuestInput;
    }): Promise<ManageGuestItemDTO> => {
      const res = await apiClient.api.v1.manage.events[':id'].guests[':guestId'].$put({
        param: { id: eventId, guestId },
        json: input,
      });

      if (!res.ok) {
        const errorJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errorJson.error?.message || 'Gagal memperbarui data tamu');
      }

      const json = await res.json();
      return json.data as ManageGuestItemDTO;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'guests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'metrics'],
      });
    },
  });
}

/**
 * Hook mutasi untuk menghapus tamu dari acara.
 */
export function useDeleteGuestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      guestId,
    }: {
      eventId: string;
      guestId: string;
    }): Promise<{ id: string; deleted: boolean }> => {
      const res = await apiClient.api.v1.manage.events[':id'].guests[':guestId'].$delete({
        param: { id: eventId, guestId },
      });

      if (!res.ok) {
        const errorJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errorJson.error?.message || 'Gagal menghapus data tamu');
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'guests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'metrics'],
      });
    },
  });
}

/**
 * Hook mutasi untuk manual override status RSVP oleh Host.
 */
export function useOverrideRsvpMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      guestId,
      input,
    }: {
      eventId: string;
      guestId: string;
      input: ManualOverrideRsvpInput;
    }) => {
      const res = await apiClient.api.v1.manage.events[':id'].guests[':guestId'].override.$patch({
        param: { id: eventId, guestId },
        json: input,
      });

      if (!res.ok) {
        const errorJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errorJson.error?.message || 'Gagal melakukan override status RSVP');
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'guests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'metrics'],
      });
    },
  });
}
