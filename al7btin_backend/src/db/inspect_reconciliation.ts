import { WalletLedgerService } from '../services/wallet-ledger.service.js';

async function main() {
  const res = await WalletLedgerService.runSystemWideReconciliation();
  console.log('Reconciliation result:', JSON.stringify(res, null, 2));
  process.exit(0);
}
main();
