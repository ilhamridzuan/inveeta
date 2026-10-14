import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface HostEventSummary {
  id: string;
  title: string;
  slug: string;
  eventDate?: string | Date | null;
  timeZone?: string;
}

export function useActiveEvent() {
  const { eventId: routeEventId } = useParams<{ eventId?: string }>();

  const { data: myEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const res = await apiClient.api.v1.manage.events.mine.$get();
      if (!res.ok) throw new Error('Gagal mengambil daftar acara');
      const json = await res.json();
      return json.data as HostEventSummary[];
    },
  });

  const activeEventId = useMemo(() => {
    if (routeEventId) return routeEventId;
    if (myEvents && myEvents.length > 0) return myEvents[0]?.id;
    return undefined;
  }, [routeEventId, myEvents]);

  const activeEvent = useMemo(() => {
    return myEvents?.find((e) => e.id === activeEventId);
  }, [myEvents, activeEventId]);

  return {
    routeEventId,
    activeEventId,
    activeEvent,
    myEvents,
    isLoadingEvents,
  };
}
