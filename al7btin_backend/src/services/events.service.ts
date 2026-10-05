import { Response } from 'express';

export interface SSEClient {
  id: string;
  userId: string;
  role: string;
  res: Response;
  connectedAt: number;
}

export interface SystemEventPayload {
  type: string;
  targetUserId?: string;
  targetRoles?: string[];
  data: Record<string, any>;
  timestamp: string;
}

/**
 * Server-Sent Events (SSE) Real-Time Service
 * Manages active client connections with heartbeat keepalive, role/user isolation, and broadcast filtering.
 */
export class EventsService {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    // Send keepalive comment every 25 seconds to prevent proxy timeouts
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 25 * 1000);

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Register a new SSE client
   */
  addClient(clientId: string, userId: string, role: string, res: Response): void {
    this.clients.set(clientId, {
      id: clientId,
      userId,
      role,
      res,
      connectedAt: Date.now(),
    });

    // Send initial connected acknowledgement
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);
  }

  /**
   * Remove an SSE client on disconnect
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Helper emit method for standard event emission
   */
  emit(type: string, data: Record<string, any> = {}, options?: { targetUserId?: string; targetRoles?: string[] }): number {
    return this.emitEvent({
      type,
      data,
      targetUserId: options?.targetUserId,
      targetRoles: options?.targetRoles,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit a real-time event to authorized target clients
   */
  emitEvent(event: SystemEventPayload): number {
    let sentCount = 0;
    const formattedData = `data: ${JSON.stringify(event)}\n\n`;

    for (const [clientId, client] of this.clients.entries()) {
      let isTarget = false;

      // 1. Direct user match
      if (event.targetUserId && client.userId === event.targetUserId) {
        isTarget = true;
      }

      // 2. Target roles match
      if (event.targetRoles && event.targetRoles.includes(client.role)) {
        isTarget = true;
      }

      // 3. Global broadcast if neither is specified
      if (!event.targetUserId && !event.targetRoles) {
        isTarget = true;
      }

      if (isTarget) {
        try {
          client.res.write(formattedData);
          sentCount++;
        } catch {
          this.removeClient(clientId);
        }
      }
    }

    return sentCount;
  }

  /**
   * Keepalive heartbeat ping
   */
  private broadcastHeartbeat(): void {
    const ping = `: heartbeat ${Date.now()}\n\n`;
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(ping);
      } catch {
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Get active connection metrics
   */
  getActiveConnectionsCount(): number {
    return this.clients.size;
  }
}

export const eventsService = new EventsService();
