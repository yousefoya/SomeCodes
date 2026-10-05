import { randomUUID } from 'crypto';

export type JobHandler<T = any> = (data: T, jobId: string) => Promise<void>;

export interface Job<T = any> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface QueueMetrics {
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
}

/**
 * Asynchronous Background Queue & Worker Service
 * Handles non-blocking background jobs (notifications, analytics, audit log writing, cache warming)
 * with automatic retries, exponential backoff, and dead-letter tracking.
 */
export class QueueService {
  private handlers = new Map<string, JobHandler>();
  private queue: Job[] = [];
  private deadLetterQueue: Job[] = [];
  private isProcessing = false;
  private completedJobsCount = 0;
  private failedJobsCount = 0;

  /**
   * Register a job handler
   */
  registerHandler<T>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler);
  }

  /**
   * Push a job to the background queue
   */
  async enqueue<T>(name: string, data: T, maxAttempts: number = 3): Promise<string> {
    const job: Job<T> = {
      id: `job_${randomUUID().slice(0, 8)}`,
      name,
      data,
      attempts: 0,
      maxAttempts,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.queue.push(job);
    this.processNext();
    return job.id;
  }

  /**
   * Process next jobs in queue
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      const handler = this.handlers.get(job.name);
      if (!handler) {
        console.warn(`⚠️ [QUEUE] No handler registered for job '${job.name}'. Moving to dead letter queue.`);
        job.status = 'failed';
        job.error = 'NO_HANDLER_REGISTERED';
        this.deadLetterQueue.push(job);
        this.failedJobsCount++;
        continue;
      }

      job.status = 'processing';
      job.attempts++;

      try {
        await handler(job.data, job.id);
        job.status = 'completed';
        this.completedJobsCount++;
      } catch (err: any) {
        console.error(`❌ [QUEUE_JOB_ERROR] Job '${job.name}' (ID: ${job.id}) failed on attempt ${job.attempts}/${job.maxAttempts}:`, err.message);

        if (job.attempts < job.maxAttempts) {
          // Exponential backoff: 2s, 4s, 8s...
          const backoffDelay = Math.pow(2, job.attempts) * 1000;
          setTimeout(() => {
            job.status = 'pending';
            this.queue.push(job);
            this.processNext();
          }, backoffDelay);
        } else {
          job.status = 'failed';
          job.error = err.message || 'UNKNOWN_ERROR';
          this.deadLetterQueue.push(job);
          this.failedJobsCount++;
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get queue operational metrics
   */
  getMetrics(): QueueMetrics {
    return {
      pendingCount: this.queue.length,
      processingCount: this.isProcessing ? 1 : 0,
      completedCount: this.completedJobsCount,
      failedCount: this.failedJobsCount,
    };
  }

  /**
   * Get dead letter failed jobs for inspection
   */
  getDeadLetterJobs(limit: number = 20): Job[] {
    return this.deadLetterQueue.slice(-limit);
  }
}

export const queueService = new QueueService();
