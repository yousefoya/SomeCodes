import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';

interface InFlightLock {
  timestamp: number;
  timeoutHandle: NodeJS.Timeout;
}

/**
 * In-Flight Request Deduplication & Concurrency Lock Service
 * Prevents accidental simultaneous duplicate submissions (double clicks, network retries)
 * from processing concurrent mutations for the same resource or action.
 */
export class DeduplicationService {
  private activeLocks = new Map<string, InFlightLock>();
  private defaultLockTtlMs = 15000; // 15 seconds max lock

  /**
   * Acquire a lock for a key. Returns true if acquired, false if already locked.
   */
  acquire(key: string, ttlMs: number = this.defaultLockTtlMs): boolean {
    if (this.activeLocks.has(key)) {
      return false;
    }

    const timeoutHandle = setTimeout(() => {
      this.release(key);
    }, ttlMs);

    // Unref to not block process exit
    if (timeoutHandle.unref) {
      timeoutHandle.unref();
    }

    this.activeLocks.set(key, {
      timestamp: Date.now(),
      timeoutHandle,
    });

    return true;
  }

  /**
   * Release an acquired lock
   */
  release(key: string): void {
    const lock = this.activeLocks.get(key);
    if (lock) {
      clearTimeout(lock.timeoutHandle);
      this.activeLocks.delete(key);
    }
  }

  /**
   * Express middleware factory for request deduplication
   */
  createMiddleware(keyExtractor: (req: Request) => string | null, ttlMs: number = 10000) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const lockKey = keyExtractor(req);
      if (!lockKey) {
        return next();
      }

      const acquired = this.acquire(lockKey, ttlMs);
      if (!acquired) {
        return next(
          new AppError(
            'هذا الطلب قيد المعالجة بالفعل. يرجى الانتظار لتجنب التكرار.',
            409,
            'CONCURRENT_REQUEST_IN_PROGRESS',
            { lockKey }
          )
        );
      }

      // Auto-release lock on response finish or close
      res.on('finish', () => this.release(lockKey));
      res.on('close', () => this.release(lockKey));

      next();
    };
  }
}

export const deduplicationService = new DeduplicationService();
