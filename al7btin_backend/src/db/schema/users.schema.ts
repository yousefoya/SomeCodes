import { pgTable, text, varchar, timestamp, boolean, integer, numeric, uuid, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', [
  'customer',
  'admin',
  'delivery',
  'provider',
  'super_admin',
  'customer_service_manager',
  'customer_service_agent',
]);

/**
 * Users Table
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phoneNumber: varchar('phone_number', { length: 15 }).notNull().unique(),
    name: varchar('name', { length: 100 }),
    email: varchar('email', { length: 150 }).unique(),
    role: userRoleEnum('role').default('customer').notNull(),
    walletBalance: numeric('wallet_balance', { precision: 10, scale: 2 }).default('0.00').notNull(),
    points: integer('points').default(0).notNull(),
    referralCode: varchar('referral_code', { length: 20 }).unique(),
    isSuspended: boolean('is_suspended').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_users_phone').on(table.phoneNumber),
    index('idx_users_role').on(table.role),
    index('idx_users_role_suspended').on(table.role, table.isSuspended),
    index('idx_users_email').on(table.email),
    index('idx_users_suspended').on(table.isSuspended),
  ]
);

/**
 * Authentication OTP Sessions Table
 */
export const authOtps = pgTable(
  'auth_otps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phoneNumber: varchar('phone_number', { length: 15 }).notNull(),
    otpHash: varchar('otp_hash', { length: 255 }).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isConsumed: boolean('is_consumed').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_auth_otps_phone').on(table.phoneNumber),
    index('idx_auth_otps_active').on(table.phoneNumber, table.isConsumed, table.expiresAt),
  ]
);

/**
 * Refresh Tokens Table
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    deviceInfo: varchar('device_info', { length: 255 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_refresh_tokens_user').on(table.userId),
    index('idx_refresh_tokens_active').on(table.userId, table.isRevoked),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthOtp = typeof authOtps.$inferSelect;
export type NewAuthOtp = typeof authOtps.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
