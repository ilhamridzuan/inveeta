import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EventDashboardMetricsDTO } from '@inveeta/shared';

/**
 * Hook untuk mengambil ringkasan KPI dan metrik kehadiran acara Host.
 */
export function useEventMetricsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: ['events', eventId, 'metrics'],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<EventDashboardMetricsDTO> => {
      if (!eventId) throw new Error('Event ID is required');

      const res = await apiClient.api.v1.manage.events[':id'].metrics.$get({
        param: { id: eventId },
      });

      if (!res.ok) {
        throw new Error('Gagal memuat metrik acara');
      }

      const json = await res.json();
      return json.data as EventDashboardMetricsDTO;
    },
  });
}
