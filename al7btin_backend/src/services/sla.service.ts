/**
 * BTIN7AL (بتنحل) Generic SLA Monitoring Service
 *
 * Computes SLA deadlines, breach status, and automated escalation metrics
 * based on service and support case SLA definitions.
 */

export type SLAStatus = 'on_track' | 'warning' | 'breached' | 'completed';

export interface SLACalculationResult {
  slaHours: number;
  createdAt: Date;
  deadline: Date;
  timeRemainingMs: number;
  timeElapsedMs: number;
  percentageElapsed: number;
  status: SLAStatus;
  isOverdue: boolean;
}

export class SLAService {
  /**
   * Compute SLA status for a given entity based on creation time and SLA duration
   */
  public calculateSLA(
    createdAt: Date | string,
    slaHours: number = 24,
    completedAt?: Date | string | null
  ): SLACalculationResult {
    const created = new Date(createdAt);
    const deadline = new Date(created.getTime() + slaHours * 60 * 60 * 1000);
    const now = completedAt ? new Date(completedAt) : new Date();

    const totalDurationMs = slaHours * 60 * 60 * 1000;
    const timeElapsedMs = Math.max(0, now.getTime() - created.getTime());
    const timeRemainingMs = deadline.getTime() - now.getTime();
    const isOverdue = timeRemainingMs < 0;

    const percentageElapsed = Math.min(
      100,
      Math.max(0, Math.round((timeElapsedMs / totalDurationMs) * 100))
    );

    let status: SLAStatus = 'on_track';
    if (completedAt) {
      status = 'completed';
    } else if (isOverdue) {
      status = 'breached';
    } else if (percentageElapsed >= 75) {
      status = 'warning';
    }

    return {
      slaHours,
      createdAt: created,
      deadline,
      timeRemainingMs,
      timeElapsedMs,
      percentageElapsed,
      status,
      isOverdue,
    };
  }

  /**
   * Support Case SLA defaults by priority
   */
  public getCaseSLADurationHours(priority: 'low' | 'normal' | 'high' | 'urgent'): number {
    switch (priority) {
      case 'urgent':
        return 2;
      case 'high':
        return 6;
      case 'normal':
        return 24;
      case 'low':
        return 48;
      default:
        return 24;
    }
  }
}

export const slaService = new SLAService();
