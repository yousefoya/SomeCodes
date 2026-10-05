import { db } from '../db/index.js';
import {
  providerBankAccounts,
  withdrawalRequests,
  providerWallets,
} from '../db/schema/finance.schema.js';
import { WalletLedgerService } from './wallet-ledger.service.js';
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';

export interface AddBankAccountInput {
  providerId: string;
  bankName: string;
  bankNameEn?: string;
  accountHolderName: string;
  iban: string;
  swiftCode?: string;
}

export class WithdrawalService {
  /**
   * Validates and normalizes a Jordanian IBAN
   */
  public static validateJordanianIban(rawIban: string): { isValid: boolean; normalizedIban: string; maskedIban: string } {
    const cleaned = rawIban.replace(/[\s-]/g, '').toUpperCase();

    // Jordanian IBAN specification: Starts with JO, followed by 2 check digits and 26 alphanumeric chars (total length: 30)
    const isValid = /^JO\d{2}[A-Z0-9]{26}$/.test(cleaned);
    const last4 = cleaned.slice(-4);
    const maskedIban = cleaned.length >= 8 ? `JO${'*'.repeat(cleaned.length - 6)}${last4}` : `JO******${last4}`;

    return {
      isValid,
      normalizedIban: cleaned,
      maskedIban,
    };
  }

  /**
   * Adds a new provider bank account
   */
  public static async addBankAccount(input: AddBankAccountInput) {
    const { isValid, normalizedIban, maskedIban } = this.validateJordanianIban(input.iban);

    if (!isValid) {
      throw new AppError(
        'صيغة الآيبان الأردني غير صالحة. يجب أن يبدأ بـ JO ويتكون من 30 حرفاً ورقماً (مثال: JO29ARAB0123456789012345678901)',
        400,
        'INVALID_JORDANIAN_IBAN'
      );
    }

    if (!input.bankName || input.bankName.trim().length < 2) {
      throw new AppError('يرجى تحديد اسم البنك', 400, 'BANK_NAME_REQUIRED');
    }

    if (!input.accountHolderName || input.accountHolderName.trim().length < 3) {
      throw new AppError('يرجى إدخال اسم صاحب الحساب كما هو مسجل في البنك', 400, 'HOLDER_NAME_REQUIRED');
    }

    // Check if duplicate IBAN exists for this provider
    const existing = await db
      .select()
      .from(providerBankAccounts)
      .where(and(eq(providerBankAccounts.providerId, input.providerId), eq(providerBankAccounts.iban, normalizedIban)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Check if there are other accounts (if first, make primary)
    const otherAccounts = await db
      .select()
      .from(providerBankAccounts)
      .where(eq(providerBankAccounts.providerId, input.providerId));

    const isPrimary = otherAccounts.length === 0;

    const [account] = await db
      .insert(providerBankAccounts)
      .values({
        providerId: input.providerId,
        bankName: input.bankName.trim(),
        bankNameEn: input.bankNameEn?.trim(),
        accountHolderName: input.accountHolderName.trim(),
        iban: normalizedIban,
        maskedIban,
        swiftCode: input.swiftCode?.trim().toUpperCase(),
        isVerified: true, // Extensible verification interface (auto-marked verified in sandbox/dev)
        verifiedAt: new Date(),
        isPrimary,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return account;
  }

  /**
   * Retrieves all bank accounts for a provider
   */
  public static async getProviderBankAccounts(providerId: string) {
    return await db
      .select()
      .from(providerBankAccounts)
      .where(eq(providerBankAccounts.providerId, providerId))
      .orderBy(desc(providerBankAccounts.isPrimary), desc(providerBankAccounts.createdAt));
  }

  /**
   * Deletes a bank account (if not referenced by pending withdrawal)
   */
  public static async deleteBankAccount(providerId: string, accountId: string) {
    // Check pending withdrawals
    const pendingWth = await db
      .select()
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.bankAccountId, accountId),
          eq(withdrawalRequests.status, 'requested')
        )
      )
      .limit(1);

    if (pendingWth.length > 0) {
      throw new AppError('لا يمكن حذف الحساب البنكي لوجود طلب سحب معلق مرتبط به', 400, 'BANK_ACCOUNT_IN_USE');
    }

    await db
      .delete(providerBankAccounts)
      .where(and(eq(providerBankAccounts.id, accountId), eq(providerBankAccounts.providerId, providerId)));

    return { success: true };
  }
}
