import { appEventBus, type AppDomainEvent, type RealtimeEventType } from './bus.js';

export class SSEChannelHub {
  // Map eventId -> (Map clientId -> ReadableStreamDefaultController)
  private readonly channels = new Map<string, Map<string, ReadableStreamDefaultController>>();

  constructor() {
    // Daftarkan listener otomatis ke seluruh event domain dari Event Bus
    const eventTypes: RealtimeEventType[] = [
      'wish.created',
      'wish.moderated',
      'wish.deleted',
      'rsvp.updated',
      'metrics.updated',
    ];

    for (const type of eventTypes) {
      appEventBus.subscribe(type, (e) => this.broadcastEvent(e));
    }
  }

  /**
   * Mendaftarkan koneksi klien aktif ke channel acara tertentu (O(1)).
   */
  subscribe(
    eventId: string,
    clientId: string,
    controller: ReadableStreamDefaultController
  ): void {
    let clients = this.channels.get(eventId);
    if (!clients) {
      clients = new Map();
      this.channels.set(eventId, clients);
    }
    clients.set(clientId, controller);
  }

  /**
   * Menghapus koneksi klien dan membersihkan channel jika tidak ada listener aktif (O(1)).
   */
  unsubscribe(eventId: string, clientId: string): void {
    const clients = this.channels.get(eventId);
    if (!clients) return;

    clients.delete(clientId);
    if (clients.size === 0) {
      this.channels.delete(eventId); // Bebaskan memori jika 0 subscriber aktif
    }
  }

  /**
   * Menyiarkan domain event ke seluruh klien yang terhubung ke acara tertentu.
   */
  broadcastEvent(event: AppDomainEvent): void {
    const clients = this.channels.get(event.eventId);
    if (!clients || clients.size === 0) return;

    const formattedPayload = `id: ${event.timestamp}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    const encoded = new TextEncoder().encode(formattedPayload);

    for (const [clientId, controller] of clients.entries()) {
      try {
        controller.enqueue(encoded);
      } catch {
        this.unsubscribe(event.eventId, clientId);
      }
    }
  }

  /**
   * Broadcast data kustom langsung ke klien channel acara tertentu.
   */
  broadcast(
    eventId: string,
    eventName: string,
    data: unknown,
    eventIdHeader?: string
  ): void {
    const clients = this.channels.get(eventId);
    if (!clients || clients.size === 0) return;

    const idField = eventIdHeader ? `id: ${eventIdHeader}\n` : '';
    const payload = `${idField}event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(payload);

    for (const [clientId, controller] of clients.entries()) {
      try {
        controller.enqueue(encoded);
      } catch {
        this.unsubscribe(eventId, clientId);
      }
    }
  }

  /**
   * Mengembalikan jumlah subscriber aktif untuk monitoring channel.
   */
  getActiveClientCount(eventId?: string): number {
    if (eventId) {
      return this.channels.get(eventId)?.size ?? 0;
    }
    let total = 0;
    for (const map of this.channels.values()) {
      total += map.size;
    }
    return total;
  }
}

export const sseHub = new SSEChannelHub();
