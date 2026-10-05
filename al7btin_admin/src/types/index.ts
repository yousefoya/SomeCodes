export type UserRole =
  | 'customer'
  | 'admin'
  | 'provider'
  | 'delivery'
  | 'super_admin'
  | 'customer_service_manager'
  | 'customer_service_agent';

export interface User {
  id: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  walletBalance: number;
  points: number;
  referralCode: string | null;
  isSuspended: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type Permission =
  | 'view_dashboard'
  | 'view_orders'
  | 'manage_orders'
  | 'view_customers'
  | 'manage_customers'
  | 'view_customer_history'
  | 'manage_customer_service'
  | 'create_customer_notes'
  | 'create_support_case'
  | 'view_support_cases'
  | 'manage_support_cases'
  | 'contact_customer'
  | 'update_order_support_status'
  | 'request_refunds'
  | 'review_refunds'
  | 'approve_refunds'
  | 'execute_refunds'
  | 'view_refund_history'
  | 'view_staff_activity'
  | 'view_customer_service_analytics'
  | 'manage_staff'
  | 'manage_roles'
  | 'manage_permissions'
  | 'view_audit_logs'
  | 'view_analytics'
  | 'view_providers'
  | 'manage_providers'
  | 'view_delivery'
  | 'manage_delivery'
  | 'manage_services'
  | 'manage_coupons'
  | 'manage_offers'
  | 'manage_settings'
  | 'view_finance'
  | 'manage_finance'
  | 'manage_commissions'
  | 'manage_withdrawals';

export interface StaffProfile {
  id: string;
  userId: string;
  employeeCode: string | null;
  department: string;
  casesHandledCount: number;
  ordersHandledCount: number;
  lastActiveAt?: string | null;
  notes?: string | null;
}

export interface StaffMember {
  id: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  isSuspended: boolean;
  employeeCode?: string | null;
  department?: string;
  casesHandledCount?: number;
  ordersHandledCount?: number;
  lastActiveAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerServiceNote {
  id: string;
  customerId: string;
  orderId?: string | null;
  authorUserId: string;
  authorRole: string;
  authorName?: string | null;
  note: string;
  createdAt: string;
}

export type SupportCaseStatus = 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
export type SupportCasePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SupportCase {
  id: string;
  caseNumber: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  orderId?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  createdByStaffId: string;
  createdByStaffName?: string;
  title: string;
  description: string;
  category?: string;
  status: SupportCaseStatus;
  priority: SupportCasePriority;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RefundStatus = 'requested' | 'under_review' | 'approved' | 'rejected' | 'processed' | 'failed';

export interface RefundRequest {
  id: string;
  refundNumber: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  amount: number;
  maxRefundableAmount: number;
  reason: string;
  status: RefundStatus;
  requestedByUserId: string;
  requestedByName?: string;
  reviewedByUserId?: string | null;
  reviewedByName?: string | null;
  approvedByUserId?: string | null;
  approvedByName?: string | null;
  processedByUserId?: string | null;
  processedByName?: string | null;
  rejectionReason?: string | null;
  gatewayReference?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  actorName?: string | null;
  actorRole: string;
  actorPhone?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  createdAt: string;
}

export interface CustomerSummary {
  customer: User;
  activeOrders: Order[];
  pastOrders: Order[];
  notes: CustomerServiceNote[];
  cases: SupportCase[];
  refunds: RefundRequest[];
}

export interface AgentDashboardSummary {
  role: 'customer_service_agent';
  myOpenCasesCount: number;
  myInProgressCasesCount?: number;
  myWaitingCasesCount: number;
  urgentCasesCount?: number;
  handledInteractionsToday: number;
  handledTodayCount?: number;
  recentCases: SupportCase[];
  recentlyUpdatedCases?: SupportCase[];
}

export interface ManagerDashboardSummary {
  role: 'customer_service_manager';
  openCasesCount: number;
  totalOpenCasesCount?: number;
  unassignedCasesCount: number;
  urgentCasesCount: number;
  pendingRefundsCount: number;
  activeStaffCount: number;
  casesByStatus?: Record<string, number>;
  casesByAgent?: Array<{ agentId: string; agentName: string; activeCasesCount: number }>;
  averageWorkload?: number;
  recentlyEscalatedCases?: SupportCase[];
  recentRefunds: RefundRequest[];
  recentCases: SupportCase[];
}

export interface SuperAdminDashboardSummary {
  role: 'super_admin' | 'admin';
  totalStaff: number;
  activeStaff: number;
  openCases: number;
  pendingRefunds: number;
  totalOrders: number;
  activeOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  recentAuditLogs: AuditLog[];
}

export type StaffDashboardSummary =
  | AgentDashboardSummary
  | ManagerDashboardSummary
  | SuperAdminDashboardSummary;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total?: number;
  count?: number;
  totalPages?: number;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  iconName?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceOption {
  id: string;
  serviceId: string;
  nameAr: string;
  nameEn: string;
  optionType?: 'variant' | 'addon' | 'package' | 'product';
  size?: string | null;
  price: number;
  unitAr?: string | null;
  unitEn?: string | null;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder?: number;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  gallery?: string[];
  brand?: string | null;
  color?: string | null;
  specifications?: Record<string, any>;
  installationPrice?: number;
  packageWorkerCount?: number | null;
  packageDurationHours?: number | null;
  metadata?: Record<string, any>;
}

export type DynamicFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'counter'
  | 'slider'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'toggle'
  | 'multi_select'
  | 'date'
  | 'time'
  | 'datetime'
  | 'image_upload'
  | 'location';

export interface DynamicFieldOption {
  labelAr: string;
  labelEn: string;
  value: any;
  priceModifier?: number;
  isDefault?: boolean;
}

export interface DynamicServiceField {
  id?: string;
  key: string;
  labelAr: string;
  labelEn: string;
  fieldType: DynamicFieldType;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  placeholderAr?: string | null;
  placeholderEn?: string | null;
  helpTextAr?: string | null;
  helpTextEn?: string | null;
  defaultValue?: any;
  min?: number | null;
  max?: number | null;
  step?: number | null;
  unitAr?: string | null;
  unitEn?: string | null;
  options?: DynamicFieldOption[];
  validationRules?: Record<string, any>;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
  metadata?: Record<string, any>;
}

export type RuleOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty';

export interface RuleExpression {
  field: string;
  op: RuleOperator;
  value?: any;
}

export interface RuleCondition {
  operator?: 'AND' | 'OR';
  expressions?: RuleExpression[];
  field?: string;
  op?: RuleOperator;
  value?: any;
}

export type RuleActionType =
  | 'SHOW_FIELD'
  | 'HIDE_FIELD'
  | 'REQUIRE_FIELD'
  | 'UNREQUIRE_FIELD'
  | 'SHOW_ALERT'
  | 'REQUIRE_CAPABILITY';

export interface RuleAction {
  type: RuleActionType;
  targetField?: string;
  messageAr?: string;
  messageEn?: string;
  severity?: 'info' | 'warning' | 'error';
  capabilityKey?: string;
  payload?: any;
}

export interface DynamicServiceRule {
  id?: string;
  ruleName: string;
  description?: string | null;
  condition: RuleCondition;
  actions: RuleAction[];
  priority: number;
  isActive: boolean;
}

export type PricingRuleType =
  | 'base'
  | 'field_addon'
  | 'field_multiplier'
  | 'option_surcharge'
  | 'tiered_volume'
  | 'step_increment'
  | 'conditional_formula';

export interface DynamicServicePricingRule {
  id?: string;
  ruleType: PricingRuleType;
  titleAr: string;
  titleEn: string;
  targetField?: string | null;
  calculationFormula: Record<string, any>;
  condition?: RuleCondition | null;
  sortOrder: number;
  isActive: boolean;
}

export interface DynamicServiceRequirement {
  id?: string;
  requirementType: string;
  capabilityKey: string;
  capabilityNameAr: string;
  capabilityNameEn: string;
  isRequired: boolean;
  condition?: RuleCondition | null;
}

export interface DynamicServiceVersion {
  id: string;
  serviceId: string;
  version: number;
  schemaSnapshot: Record<string, any>;
  publishedByUserId?: string | null;
  publishedByName?: string | null;
  changelog?: string | null;
  createdAt: string;
}

export interface DynamicServiceBuilderData {
  service: Service;
  fields: DynamicServiceField[];
  rules: DynamicServiceRule[];
  pricingRules: DynamicServicePricingRule[];
  requirements: DynamicServiceRequirement[];
  options: ServiceOption[];
  versions?: DynamicServiceVersion[];
}

export interface DynamicPriceCalculationResult {
  basePrice: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  discount: number;
  breakdown: Array<{
    titleAr: string;
    titleEn: string;
    amount: number;
    type: string;
  }>;
  serviceVersion: number;
  appliedRules?: string[];
  alerts?: Array<{
    messageAr: string;
    messageEn: string;
    severity: 'info' | 'warning' | 'error';
  }>;
}

export interface Service {
  id: string;
  categoryId: string;
  providerId?: string | null;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  iconName?: string | null;
  imageUrl?: string | null;
  gallery?: string[];
  basePrice: number;
  unitAr?: string | null;
  unitEn?: string | null;
  type?: 'home_service' | 'delivery_product';
  status?: 'draft' | 'in_review' | 'published' | 'archived';
  currentVersion?: number;
  slaHours?: number;
  minOrderValue?: number | null;
  maxOrderValue?: number | null;
  coverageAreas?: string[];
  isPublished?: boolean;
  requiresQuotation?: boolean;
  isAvailable?: boolean;
  isActive: boolean;
  sortOrder?: number;
  startingPriceLabelAr?: string | null;
  startingPriceLabelEn?: string | null;
  disclaimerAr?: string | null;
  disclaimerEn?: string | null;
  isLaborOnly?: boolean;
  serviceMode?: 'product_variant' | 'dynamic_form' | 'labor_inspection' | 'package_bundle' | 'product_installation';
  options?: ServiceOption[];
  fields?: DynamicServiceField[];
  rules?: DynamicServiceRule[];
  pricingRules?: DynamicServicePricingRule[];
  requirements?: DynamicServiceRequirement[];
  category?: Category;
  createdAt: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'customer_approved' | 'customer_rejected' | 'expired' | 'cancelled';

export interface QuotationLineItem {
  id: string;
  titleAr: string;
  titleEn: string;
  type: 'labor' | 'materials' | 'spare_parts' | 'equipment' | 'additional_work';
  unitPrice: number;
  quantity: number;
  total: number;
  notes?: string;
}

export interface Quotation {
  id: string;
  orderId: string;
  serviceId: string;
  providerId?: string | null;
  createdByUserId?: string | null;
  createdByName?: string | null;
  status: QuotationStatus;
  laborAmount: number;
  materialsAmount: number;
  sparePartsAmount: number;
  equipmentAmount: number;
  serviceFees: number;
  discountAmount: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  items: QuotationLineItem[];
  notes?: string | null;
  attachments: string[];
  customerNotes?: string | null;
  expiresAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: any;
  service?: Service;
  provider?: any;
}

export interface ProviderServiceAssignment {
  id: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  basePrice: number;
  unitAr?: string;
  unitEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  iconName?: string;
  isAvailable: boolean;
  isActive: boolean;
  options?: ServiceOption[];
}

export interface Provider {
  id: string;
  userId?: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  logo?: string | null;
  phoneNumber: string;
  address: string;
  latitude: number;
  longitude: number;
  operatingHours: string;
  isActive: boolean;
  isAvailable: boolean;
  rating: string | number;
  createdAt: string;
  updatedAt: string;
  serviceIds: string[];
  availableServiceIds?: string[];
  services?: ProviderServiceAssignment[];
  serviceCategoryIds?: string[];
  coverageAreas?: string[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'offered_to_driver'
  | 'awaiting_assignment'
  | 'assigned'
  | 'accepted'
  | 'going_to_pickup'
  | 'picked_up'
  | 'going_to_customer'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'failed';

export interface OrderItem {
  id?: string;
  orderId?: string;
  serviceId: string;
  serviceOptionId?: string | null;
  variantNameAr?: string | null;
  variantNameEn?: string | null;
  titleAr: string;
  titleEn: string;
  unitPrice: number;
  quantity: number;
  itemTotal: number;
  unitAr?: string;
  unitEn?: string;
  isHomeService?: boolean;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedByUserId: string;
  notes?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceCategoryId: string;
  providerId: string | null;
  providerName: string | null;
  providerPhone: string | null;
  pickupAddress: string | null;
  deliveryCity: string;
  deliveryArea: string;
  deliveryStreetAddress: string;
  deliveryBuilding?: string | null;
  deliveryFloor?: string | null;
  deliveryApartment?: string | null;
  deliveryInstructions?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  destinationAddress?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  tripDistanceKm?: string | number | null;
  cancellationReason?: string | null;
  cancelledByUserId?: string | null;
  cancelledAt?: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: string;
  status: OrderStatus;
  assignmentStatus?: string | null;
  assignedDeliveryId?: string | null;
  assignedDeliveryName?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  statusHistory?: OrderStatusHistory[];
}

export interface OrderReview {
  id: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  providerId: string;
  providerName?: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface DeliveryEmployee {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  vehicleType: string;
  vehiclePlateNumber: string;
  latitude?: number | null;
  longitude?: number | null;
  isOnline: boolean;
  isActive: boolean;
  activeOrdersCount: number;
  completedOrdersCount: number;
  rating: number;
  providerId: string;
  providerName?: string;
  categoryCapabilities: string[];
  serviceCapabilities: string[];
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: string | number;
  minOrderValue: string | number;
  expiryDate?: string | null;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  discountPercentage: number;
  promoCode?: string | null;
  bannerColor?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltySettings {
  id?: string;
  pointsPerCompletedOrder: number;
  pointsThresholdForDiscount: number;
  discountPercentage: number;
  discountFixedAmount: number;
  rewardType: 'percentage' | 'fixed_amount';
  couponExpiryDays: number;
  isActive: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  usersByRole: {
    customer: number;
    admin: number;
    provider: number;
    delivery: number;
  };
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalProviders: number;
  activeProviders: number;
  totalDrivers: number;
  activeDrivers: number;
  onlineDrivers: number;
  recentUsers: Array<{
    id: string;
    phoneNumber: string;
    name: string | null;
    role: UserRole;
    isSuspended: boolean;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryArea: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Phase 6: Financial System Entities
 */
export interface ProviderWallet {
  id: string;
  providerId: string;
  providerNameAr?: string | null;
  providerNameEn?: string | null;
  providerPhone?: string | null;
  availableBalance: number;
  pendingBalance: number;
  heldBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalCommission: number;
  totalRefunded: number;
  liabilityBalance: number;
  currency: string;
  status: 'active' | 'suspended' | 'locked' | 'under_review';
  lastReconciledAt?: string | null;
  updatedAt?: string;
}

export type WalletTransactionType =
  | 'CREDIT_ORDER_PAYMENT'
  | 'DEBIT_COMMISSION'
  | 'DEBIT_WITHDRAWAL_REQUEST'
  | 'CREDIT_WITHDRAWAL_REVERSAL'
  | 'DEBIT_WITHDRAWAL_SETTLEMENT'
  | 'DEBIT_REFUND'
  | 'CREDIT_REFUND_REVERSAL'
  | 'CREDIT_PREPAID_DEPOSIT'
  | 'CREDIT_BONUS_INCENTIVE'
  | 'DEBIT_PENALTY_ADJUSTMENT'
  | 'MANUAL_ADMIN_ADJUSTMENT';

export interface WalletTransaction {
  id: string;
  transactionNumber: string;
  walletId: string;
  providerId: string;
  providerNameAr?: string | null;
  providerNameEn?: string | null;
  type: WalletTransactionType;
  direction: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  pendingBefore: number;
  pendingAfter: number;
  heldBefore: number;
  heldAfter: number;
  referenceType: string;
  referenceId: string;
  descriptionAr: string;
  descriptionEn: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CommissionRule {
  id: string;
  nameAr: string;
  nameEn: string;
  ruleType: 'percentage' | 'fixed' | 'hybrid';
  percentageRate: number;
  fixedAmount: number;
  minCommission: number;
  maxCommission: number | null;
  serviceId?: string | null;
  categoryId?: string | null;
  providerId?: string | null;
  providerTier: string;
  timing: 'on_order_acceptance' | 'on_service_start' | 'on_service_completion' | 'on_payment_capture';
  mode: 'postpaid' | 'prepaid_deposit';
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  withdrawalNumber: string;
  providerId: string;
  providerNameAr?: string | null;
  providerNameEn?: string | null;
  providerPhone?: string | null;
  bankName?: string;
  accountHolderName?: string;
  maskedIban?: string;
  iban?: string;
  amount: number;
  feeAmount: number;
  netPayoutAmount: number;
  currency: string;
  status: 'requested' | 'under_review' | 'approved' | 'processing' | 'paid' | 'rejected' | 'failed' | 'cancelled';
  requestedAt: string;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  rejectionReason?: string | null;
  transactionReference?: string | null;
  notes?: string | null;
}

export interface FinancialKpiSummary {
  totalGmv: number;
  totalOrders: number;
  deliveryFeeInvariant: number;
  totalPlatformCommission: number;
  totalProviderEarnings: number;
  totalAvailableBalance: number;
  totalPendingBalance: number;
  totalHeldBalance: number;
  totalWithdrawn: number;
  totalRefunded: number;
  totalLiabilities: number;
  pendingWithdrawals: {
    amount: number;
    count: number;
  };
  paidWithdrawals: {
    amount: number;
    count: number;
  };
  currency: string;
}

export interface ReconciliationRun {
  id: string;
  runNumber: string;
  status: 'running' | 'completed' | 'discrepancies_found' | 'failed';
  totalWalletsAudited: number;
  totalTransactionsAudited: number;
  totalDiscrepanciesFound: number;
  totalLedgerSum: string;
  totalWalletBalances: string;
  varianceAmount: string;
  auditSummary: any;
  completedAt?: string;
  createdAt: string;
}

