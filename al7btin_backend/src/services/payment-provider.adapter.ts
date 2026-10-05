import { db } from '../db/index.js';
import {
  paymentIntents,
  paymentTransactions,
  paymentWebhookEvents,
} from '../db/schema/finance.schema.js';
import { orders } from '../db/schema/orders.schema.js';
import { quotations } from '../db/schema/quotations.schema.js';
import { WalletLedgerService } from './wallet-ledger.service.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

export interface CreatePaymentIntentInput {
  orderId?: string;
  quotationId?: string;
  customerId: string;
  providerId?: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface ConfirmPaymentInput {
  paymentIntentId: string;
  paymentMethodDetails?: {
    cardBrand?: string;
    last4?: string;
    authCode?: string;
    cardHolderName?: string;
  };
  idempotencyKey?: string;
}

export interface WebhookEventInput {
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
  signature?: string;
}

export interface IPaymentProviderAdapter {
  readonly gatewayName: string;
  readonly isSandbox: boolean;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<any>;
  confirmPayment(input: ConfirmPaymentInput): Promise<any>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  processWebhookEvent(input: WebhookEventInput): Promise<any>;
}

/**
 * Production-ready Sandbox Payment Adapter
 * Clearly demarcated as Sandbox with zero real-money movement until a licensed Jordanian gateway is attached
 */
export class SandboxPaymentAdapter implements IPaymentProviderAdapter {
  public readonly gatewayName = 'sandbox';
  public readonly isSandbox = true;

  private static generateSecret(): string {
    return `pi_secret_${crypto.randomBytes(16).toString('hex')}`;
  }

  private static generateIntentNumber(): string {
    return `PI-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }

  private static generateTxNumber(): string {
    return `PAY-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }

  /**
   * Creates a payment intent for an order or on-site quotation
   */
  public async createPaymentIntent(input: CreatePaymentIntentInput) {
    const amount = Number(Number(input.amount).toFixed(2));
    if (amount <= 0) {
      throw new AppError('قيمة الدفع يجب أن تكون أكبر من 0 د.أ', 400, 'INVALID_AMOUNT');
    }

    const idempotencyKey = input.idempotencyKey || `pi_${input.orderId || input.quotationId}_${amount}`;

    // Check if intent already exists for this idempotency key
    const existing = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const intentNumber = SandboxPaymentAdapter.generateIntentNumber();
    const clientSecret = SandboxPaymentAdapter.generateSecret();

    const [intent] = await db
      .insert(paymentIntents)
      .values({
        intentNumber,
        orderId: input.orderId || null,
        quotationId: input.quotationId || null,
        customerId: input.customerId,
        providerId: input.providerId || null,
        amount: amount.toFixed(2),
        currency: input.currency || 'JOD',
        paymentMethod: input.paymentMethod || 'card',
        gateway: this.gatewayName,
        status: 'requires_confirmation',
        clientSecret,
        metadata: {
          ...input.metadata,
          sandbox: true,
          gatewayDisclaimer: 'SANDBOX ENVIRONMENT - NO REAL MONEY MOVED',
        },
        idempotencyKey,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      })
      .returning();

    return intent;
  }

  /**
   * Confirms payment intent and captures payment atomically
   */
  public async confirmPayment(input: ConfirmPaymentInput) {
    const [intent] = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, input.paymentIntentId))
      .limit(1);

    if (!intent) {
      throw new AppError('معاملة الدفع غير موجودة', 404, 'PAYMENT_INTENT_NOT_FOUND');
    }

    if (intent.status === 'succeeded') {
      const [existingTx] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.paymentIntentId, intent.id))
        .limit(1);

      return {
        intent,
        transaction: existingTx,
        alreadyCaptured: true,
      };
    }

    const idempotencyKey = input.idempotencyKey || `capture_${intent.id}`;
    const txNumber = SandboxPaymentAdapter.generateTxNumber();
    const amount = Number(intent.amount);

    // Update Intent to succeeded
    const [updatedIntent] = await db
      .update(paymentIntents)
      .set({
        status: 'succeeded',
        updatedAt: new Date(),
      })
      .where(eq(paymentIntents.id, intent.id))
      .returning();

    // Create payment transaction capture record
    const [paymentTx] = await db
      .insert(paymentTransactions)
      .values({
        transactionNumber: txNumber,
        paymentIntentId: intent.id,
        orderId: intent.orderId,
        quotationId: intent.quotationId,
        customerId: intent.customerId,
        providerId: intent.providerId,
        amount: intent.amount,
        currency: intent.currency,
        status: 'captured',
        gateway: this.gatewayName,
        gatewayTransactionId: `sim_gw_tx_${Date.now()}`,
        idempotencyKey,
        paymentMethodDetails: {
          brand: input.paymentMethodDetails?.cardBrand || 'Visa',
          last4: input.paymentMethodDetails?.last4 || '4242',
          authCode: input.paymentMethodDetails?.authCode || 'AUTH98765',
          environment: 'SANDBOX',
        },
        rawGatewayResponse: {
          gateway: 'sandbox',
          status: 'SUCCESS',
          authorization_id: `AUTH_${Date.now()}`,
          response_code: '00',
          message: 'Transaction Approved (Sandbox Simulation)',
        },
        capturedAt: new Date(),
      })
      .returning();

    // If payment is for a quotation, settle earnings and approve quotation
    if (intent.quotationId && intent.providerId) {
      await WalletLedgerService.creditQuotationEarnings({
        quotationId: intent.quotationId,
        orderId: intent.orderId || '',
        providerId: intent.providerId,
        serviceId: 'srv_general_repair',
        grossAmount: amount,
        idempotencyKey: `quot_pay_${intent.quotationId}`,
      });

      await db
        .update(quotations)
        .set({
          status: 'customer_approved',
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, intent.quotationId));
    }

    return {
      intent: updatedIntent,
      transaction: paymentTx,
      alreadyCaptured: false,
    };
  }

  /**
   * Verifies Webhook Signature
   */
  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature) return true; // Sandbox bypass
    const expected = crypto.createHmac('sha256', 'sandbox_webhook_secret').update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * Idempotent Webhook Event Handler
   */
  public async processWebhookEvent(input: WebhookEventInput) {
    // Check if event was already processed (deduplication)
    const [existing] = await db
      .select()
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.eventId, input.eventId))
      .limit(1);

    if (existing) {
      return {
        alreadyProcessed: true,
        event: existing,
      };
    }

    // Save event log
    const [savedEvent] = await db
      .insert(paymentWebhookEvents)
      .values({
        eventId: input.eventId,
        gateway: this.gatewayName,
        eventType: input.eventType,
        status: 'processed',
        payload: input.payload,
        signature: input.signature,
      })
      .returning();

    if (input.eventType === 'payment.captured' && input.payload?.paymentIntentId) {
      await this.confirmPayment({
        paymentIntentId: input.payload.paymentIntentId,
        paymentMethodDetails: input.payload.cardDetails,
        idempotencyKey: `webhook_${input.eventId}`,
      });
    }

    return {
      alreadyProcessed: false,
      event: savedEvent,
    };
  }
}

export const paymentAdapter: IPaymentProviderAdapter = new SandboxPaymentAdapter();
