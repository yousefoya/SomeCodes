import { sql } from '../config/database.js';

interface ConsistencyCheck {
  checkName: string;
  category: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  details: string;
  count: number;
}

async function runConsistencyAudit() {
  console.log('🛡️ [DATA CONSISTENCY & INTEGRITY AUDIT] Starting comprehensive PostgreSQL verification...\n');

  const results: ConsistencyCheck[] = [];

  // 1. Check for Orphan Orders (Missing Customer)
  const [orphanCustomerOrders] = await sql`
    SELECT COUNT(*)::int as count 
    FROM orders o 
    LEFT JOIN users u ON o.customer_id = u.id 
    WHERE u.id IS NULL;
  `;
  results.push({
    checkName: 'Orphan Orders (Missing Customer)',
    category: 'Referential Integrity',
    status: orphanCustomerOrders.count === 0 ? 'PASSED' : 'FAILED',
    details: orphanCustomerOrders.count === 0 ? '0 orphan orders found' : `${orphanCustomerOrders.count} orders refer to missing users`,
    count: orphanCustomerOrders.count,
  });

  // 2. Check for Orphan Order Items (Missing Order)
  const [orphanOrderItems] = await sql`
    SELECT COUNT(*)::int as count 
    FROM order_items oi 
    LEFT JOIN orders o ON oi.order_id = o.id 
    WHERE o.id IS NULL;
  `;
  results.push({
    checkName: 'Orphan Order Items (Missing Order)',
    category: 'Referential Integrity',
    status: orphanOrderItems.count === 0 ? 'PASSED' : 'FAILED',
    details: orphanOrderItems.count === 0 ? '0 orphan items found' : `${orphanOrderItems.count} items have invalid order IDs`,
    count: orphanOrderItems.count,
  });

  // 3. Check for Orphan Support Cases (Missing Customer or Staff)
  const [orphanCases] = await sql`
    SELECT COUNT(*)::int as count 
    FROM support_cases sc 
    LEFT JOIN users u ON sc.customer_id = u.id 
    WHERE u.id IS NULL;
  `;
  results.push({
    checkName: 'Orphan Support Cases (Missing Customer)',
    category: 'Referential Integrity',
    status: orphanCases.count === 0 ? 'PASSED' : 'FAILED',
    details: orphanCases.count === 0 ? 'All support cases refer to valid customer accounts' : `${orphanCases.count} cases have missing customers`,
    count: orphanCases.count,
  });

  // 4. Check for Orphan Refund Requests
  const [orphanRefunds] = await sql`
    SELECT COUNT(*)::int as count 
    FROM refund_requests rr 
    LEFT JOIN orders o ON rr.order_id = o.id 
    LEFT JOIN users u ON rr.customer_id = u.id 
    WHERE o.id IS NULL OR u.id IS NULL;
  `;
  results.push({
    checkName: 'Orphan Refund Requests (Missing Order or Customer)',
    category: 'Referential Integrity',
    status: orphanRefunds.count === 0 ? 'PASSED' : 'FAILED',
    details: orphanRefunds.count === 0 ? 'All refunds link to valid orders and customers' : `${orphanRefunds.count} refunds have missing relations`,
    count: orphanRefunds.count,
  });

  // 5. Check for Valid Order Status Values
  const [invalidOrderStatus] = await sql`
    SELECT COUNT(*)::int as count 
    FROM orders 
    WHERE status NOT IN (
      'pending', 'confirmed', 'offered_to_driver', 'awaiting_assignment', 
      'assigned', 'accepted', 'going_to_pickup', 'picked_up', 
      'going_to_customer', 'completed', 'cancelled', 'failed', 'rejected'
    );
  `;
  results.push({
    checkName: 'Order Status Integrity',
    category: 'Domain & State Integrity',
    status: invalidOrderStatus.count === 0 ? 'PASSED' : 'FAILED',
    details: invalidOrderStatus.count === 0 ? '100% of orders have valid state-machine statuses' : `${invalidOrderStatus.count} orders have invalid status`,
    count: invalidOrderStatus.count,
  });

  // 6. Check Delivery Fee Strict Zero Policy (0.00 JOD)
  const [nonZeroDeliveryFees] = await sql`
    SELECT COUNT(*)::int as count 
    FROM orders 
    WHERE delivery_fee::numeric != 0.00;
  `;
  results.push({
    checkName: 'Strict 0.00 JOD Delivery Fee Policy',
    category: 'Business Invariant',
    status: nonZeroDeliveryFees.count === 0 ? 'PASSED' : 'WARNING',
    details: nonZeroDeliveryFees.count === 0 ? 'All orders adhere to 0.00 JOD delivery fee' : `${nonZeroDeliveryFees.count} orders have non-zero delivery fee`,
    count: nonZeroDeliveryFees.count,
  });

  // 7. Check Order Total Math: subtotal - discountAmount + deliveryFee == totalAmount
  const [mathMismatchOrders] = await sql`
    SELECT COUNT(*)::int as count 
    FROM orders 
    WHERE ROUND((subtotal::numeric - discount_amount::numeric + delivery_fee::numeric), 2) != ROUND(total_amount::numeric, 2);
  `;
  results.push({
    checkName: 'Order Pricing Math Invariant',
    category: 'Business Invariant',
    status: mathMismatchOrders.count === 0 ? 'PASSED' : 'FAILED',
    details: mathMismatchOrders.count === 0 ? '100% of order totals match (subtotal - discount + delivery)' : `${mathMismatchOrders.count} mathematical discrepancies found`,
    count: mathMismatchOrders.count,
  });

  // 8. Check Jordanian Phone Number Format Standardization
  const invalidPhones = await sql`
    SELECT id, phone_number, name, role
    FROM users 
    WHERE phone_number !~ '^07[789][0-9]{7}$';
  `;
  if (invalidPhones.length > 0) {
    console.log('   ⚠️ Non-standard phone user details:', invalidPhones);
  }
  results.push({
    checkName: 'Jordanian Phone Number Format (07[789]XXXXXXX)',
    category: 'Data Format Standard',
    status: invalidPhones.length === 0 ? 'PASSED' : 'WARNING',
    details: invalidPhones.length === 0 ? 'All user phone numbers follow standard 10-digit Jordanian format' : `${invalidPhones.length} user numbers non-standard (e.g., test or international seed)`,
    count: invalidPhones.length,
  });

  // 9. Check Staff Profiles FK Integrity
  const [orphanStaff] = await sql`
    SELECT COUNT(*)::int as count 
    FROM staff_profiles sp 
    LEFT JOIN users u ON sp.user_id = u.id 
    WHERE u.id IS NULL;
  `;
  results.push({
    checkName: 'Staff Profiles User FK Integrity',
    category: 'Referential Integrity',
    status: orphanStaff.count === 0 ? 'PASSED' : 'FAILED',
    details: orphanStaff.count === 0 ? 'All staff profiles correspond to valid user accounts' : `${orphanStaff.count} orphan staff profiles`,
    count: orphanStaff.count,
  });

  // 10. Check Audit Logs Actors FK Integrity
  const [orphanAudit] = await sql`
    SELECT COUNT(*)::int as count 
    FROM audit_logs al 
    LEFT JOIN users u ON al.actor_user_id = u.id 
    WHERE al.actor_user_id IS NOT NULL AND u.id IS NULL;
  `;
  results.push({
    checkName: 'Audit Logs Actor FK Integrity',
    category: 'Audit & Compliance',
    status: orphanAudit.count === 0 ? 'PASSED' : 'FAILED',
    details: orphanAudit.count === 0 ? 'All audit log actor IDs map to valid users' : `${orphanAudit.count} unmapped actors in audit log`,
    count: orphanAudit.count,
  });

  console.log('| # | Check Name | Category | Status | Details |');
  console.log('|---|---|---|---|---|');
  results.forEach((r, idx) => {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`| ${idx + 1} | ${r.checkName} | ${r.category} | ${icon} ${r.status} | ${r.details} |`);
  });

  const totalFailed = results.filter(r => r.status === 'FAILED').length;
  console.log(`\nAudit Complete. Total Passed: ${results.filter(r => r.status === 'PASSED').length}/${results.length}, Total Failed: ${totalFailed}`);

  await sql.end();
  if (totalFailed > 0) process.exit(1);
}

runConsistencyAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
