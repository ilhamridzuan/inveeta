import { EventEmitter } from 'node:events';

export type RealtimeEventType =
  | 'wish.created'
  | 'wish.moderated'
  | 'wish.deleted'
  | 'rsvp.updated'
  | 'metrics.updated';

export interface AppDomainEvent<T = unknown> {
  eventId: string;
  type: RealtimeEventType;
  payload: T;
  timestamp: string; // ISO 8601 UTC
}

export interface AppEventBus {
  publish<T>(event: AppDomainEvent<T>): void;
  subscribe(
    eventType: RealtimeEventType,
    handler: (event: AppDomainEvent) => void
  ): () => void;
}

class InMemoryEventBus implements AppEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Hindari MaxListenersExceededWarning pada listener event bus tunggal
    this.emitter.setMaxListeners(200);
  }

  publish<T>(event: AppDomainEvent<T>): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event); // Wildcard dispatcher untuk log / auditing
  }

  subscribe(
    eventType: RealtimeEventType,
    handler: (event: AppDomainEvent) => void
  ): () => void {
    this.emitter.on(eventType, handler);
    return () => {
      this.emitter.off(eventType, handler);
    };
  }
}

export const appEventBus: AppEventBus = new InMemoryEventBus();
