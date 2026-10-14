import React from 'react';
import type { HostEventSummary } from '@/hooks/useActiveEvent';

interface EventSelectorProps {
  events: HostEventSummary[] | undefined;
  activeEventId: string | undefined;
  onSelectEvent: (eventId: string) => void;
}

export const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  activeEventId,
  onSelectEvent,
}) => {
  if (!events || events.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground hidden md:inline">
        Acara:
      </span>
      <select
        className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={activeEventId || ''}
        aria-label="Pilih Acara"
        onChange={(e) => onSelectEvent(e.target.value)}
      >
        {events.map((evt) => (
          <option key={evt.id} value={evt.id}>
            {evt.title} ({evt.slug})
          </option>
        ))}
      </select>
    </div>
  );
};
