import { Router, Request, Response, NextFunction } from 'express';
import { paymentAdapter } from '../../services/payment-provider.adapter.js';
import { db } from '../../db/index.js';
import { paymentIntents, paymentTransactions } from '../../db/schema/finance.schema.js';
import { requireAuth } from '../../middleware/auth.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * POST /api/v1/payments/intent
 * Creates a payment intent for checkout
 */
router.post('/intent', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { orderId, quotationId, providerId, amount, paymentMethod, idempotencyKey, metadata } = req.body;

    const intent = await paymentAdapter.createPaymentIntent({
      orderId,
      quotationId,
      customerId: user.id,
      providerId,
      amount: Number(amount),
      paymentMethod,
      idempotencyKey: idempotencyKey || (req.headers['idempotency-key'] as string),
      metadata,
    });

    res.status(201).json({
      success: true,
      data: { intent },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/payments/confirm
 * Confirms payment intent and captures payment
 */
router.post('/confirm', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId, paymentMethodDetails, idempotencyKey } = req.body;

    if (!paymentIntentId) {
      throw new AppError('يرجى تزويد معرف معاملة الدفع (paymentIntentId)', 400, 'PAYMENT_INTENT_REQUIRED');
    }

    const result = await paymentAdapter.confirmPayment({
      paymentIntentId,
      paymentMethodDetails,
      idempotencyKey: idempotencyKey || (req.headers['idempotency-key'] as string),
    });

    res.json({
      success: true,
      message: 'تم تأكيد عملية الدفع بنجاح',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/payments/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentId = req.params.id as string;
    const [intent] = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, paymentId))
      .limit(1);

    if (!intent) {
      throw new AppError('معاملة الدفع غير موجودة', 404, 'PAYMENT_NOT_FOUND');
    }

    const [tx] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.paymentIntentId, intent.id))
      .limit(1);

    res.json({
      success: true,
      data: {
        intent,
        transaction: tx || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/payments/webhook
 * Public webhook endpoint for payment gateway callbacks
 */
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = (req.headers['x-webhook-signature'] || req.headers['signature']) as string;
    const rawBody = JSON.stringify(req.body);

    const isVerified = paymentAdapter.verifyWebhookSignature(rawBody, signature);
    if (!isVerified) {
      throw new AppError('فشل التحقق من صحة التوقيع الرقمي للويب هوك', 401, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const { eventId, eventType, ...payload } = req.body;
    const result = await paymentAdapter.processWebhookEvent({
      eventId: eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventType: eventType || 'payment.captured',
      payload: payload || req.body,
      signature,
    });

    res.json({
      received: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

export const paymentRoutes = router;
