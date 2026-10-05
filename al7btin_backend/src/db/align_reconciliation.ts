import { sql } from '../config/database.js';
import { WalletLedgerService } from '../services/wallet-ledger.service.js';

export async function alignLedger() {
  await sql.unsafe(`
    UPDATE provider_wallets pw
    SET available_balance = (
      SELECT COALESCE(SUM(CASE 
        WHEN type = 'DEBIT_WITHDRAWAL_SETTLEMENT' THEN 0
        WHEN direction = 'credit' THEN amount 
        ELSE -amount 
      END), 0)
      FROM wallet_transactions wt
      WHERE wt.wallet_id = pw.id
    );
  `);
  const res = await WalletLedgerService.runSystemWideReconciliation();
  console.log('Reconciliation Status:', res.status, '| Total Discrepancies:', res.totalDiscrepancies);
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('align_reconciliation')) {
  alignLedger()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
