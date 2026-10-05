import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Headphones,
  User as UserIcon,
  Clock,
  Plus,
  LifeBuoy,
  RotateCcw,
  ShoppingBag,
  FileText,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { customerServiceApi } from '../api/customer-service.api';
import { supportCasesApi } from '../api/support-cases.api';
import { refundsApi } from '../api/refunds.api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { User, Order, SupportCasePriority } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { OrderStatusBadge } from '../components/shared/OrderStatusBadge';

export const CustomerServicePage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [searchMode, setSearchMode] = useState<'customer' | 'order'>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [selectedOrderForNote, setSelectedOrderForNote] = useState<string | null>(null);

  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseCategory, setCaseCategory] = useState('general');
  const [caseDescription, setCaseDescription] = useState('');
  const [casePriority, setCasePriority] = useState<SupportCasePriority>('normal');
  const [selectedOrderForCase, setSelectedOrderForCase] = useState<string | null>(null);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundNotes, setRefundNotes] = useState('');

  // Selected Order Drawer
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);

  // Customer Search Query
  const { data: customerSearchResults, isFetching: isSearchingCustomers } = useQuery({
    queryKey: ['cs-search-customers', searchQuery],
    queryFn: () => customerServiceApi.searchCustomers(searchQuery),
    enabled: searchMode === 'customer' && searchQuery.trim().length >= 2,
  });

  // Order Search Query
  const { data: orderSearchResults, isFetching: isSearchingOrders } = useQuery({
    queryKey: ['cs-search-orders', searchQuery],
    queryFn: () => customerServiceApi.searchOrders(searchQuery),
    enabled: searchMode === 'order' && searchQuery.trim().length >= 2,
  });

  const isSearching = isSearchingCustomers || isSearchingOrders;

  // Customer Summary 360 View
  const {
    data: summary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['cs-customer-summary', selectedCustomerId],
    queryFn: () => customerServiceApi.getCustomerSummary(selectedCustomerId!),
    enabled: !!selectedCustomerId,
  });

  // Create Note Mutation
  const noteMutation = useMutation({
    mutationFn: customerServiceApi.createCustomerNote,
    onSuccess: () => {
      success(t.customerService.noteAddedSuccess);
      setIsNoteModalOpen(false);
      setNoteContent('');
      setSelectedOrderForNote(null);
      refetchSummary();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Create Support Case Mutation
  const caseMutation = useMutation({
    mutationFn: supportCasesApi.createSupportCase,
    onSuccess: () => {
      success('تم إنشاء تذكرة الدعم بنجاح.');
      setIsCaseModalOpen(false);
      setCaseTitle('');
      setCaseCategory('general');
      setCaseDescription('');
      setSelectedOrderForCase(null);
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ['support-cases'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Create Refund Request Mutation
  const refundMutation = useMutation({
    mutationFn: refundsApi.createRefundRequest,
    onSuccess: () => {
      success('تم رفع طلب الاسترجاع بنجاح للمراجعة والاعتماد.');
      setIsRefundModalOpen(false);
      setSelectedOrderForRefund(null);
      setRefundAmount('');
      setRefundReason('');
      setRefundNotes('');
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  const handleSelectCustomer = (customer: User) => {
    setSelectedCustomerId(customer.id);
  };

  const handleSelectOrder = (order: Order) => {
    if (order.customerId) {
      setSelectedCustomerId(order.customerId);
    }
    setInspectedOrder(order);
  };

  const handleOpenRefundModal = (order: Order) => {
    setSelectedOrderForRefund(order);
    setRefundAmount(order.totalAmount.toString());
    setIsRefundModalOpen(true);
  };

  const categoryFormOptions = [
    { value: 'order_delay', label: t.supportCases.categories.order_delay },
    { value: 'damaged_item', label: t.supportCases.categories.damaged_item },
    { value: 'wrong_item', label: t.supportCases.categories.wrong_item },
    { value: 'driver_behavior', label: t.supportCases.categories.driver_behavior },
    { value: 'payment_issue', label: t.supportCases.categories.payment_issue },
    { value: 'general_inquiry', label: t.supportCases.categories.general_inquiry },
    { value: 'general', label: t.supportCases.categories.general },
    { value: 'other', label: t.supportCases.categories.other },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 flex items-center gap-2">
          <Headphones className="w-6 h-6 text-brand-600" />
          {t.customerService.title}
        </h1>
        <p className="text-xs sm:text-sm text-surface-500 mt-1">
          {t.customerService.subtitle}
        </p>
      </div>

      {/* Fast Search Card */}
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-white to-surface-50 border-brand-200/80 shadow-md space-y-3">
        {/* Mode Toggle Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSearchMode('customer');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
              searchMode === 'customer'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {t.customerService.searchModeCustomer}
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchMode('order');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
              searchMode === 'order'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {t.customerService.searchModeOrder}
          </button>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute top-3.5 ltr:left-4 rtl:right-4 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchMode === 'customer'
                ? t.customerService.searchPlaceholder
                : t.customerService.orderSearchPlaceholder
            }
            className="w-full h-12 ltr:pl-12 rtl:pr-12 ltr:pr-4 rtl:pl-4 bg-white border border-surface-200 rounded-2xl text-sm font-semibold text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-xs"
          />
          {isSearching && (
            <div className="absolute top-3.5 ltr:right-4 rtl:left-4 text-xs font-semibold text-brand-600 animate-pulse">
              {t.common.loading}
            </div>
          )}
        </div>

        {/* Customer Search Results Dropdown / Preview */}
        {searchMode === 'customer' && customerSearchResults && customerSearchResults.length > 0 && (
          <div className="mt-3 divide-y divide-surface-100 bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
            {customerSearchResults.map((cust) => (
              <div
                key={cust.id}
                onClick={() => handleSelectCustomer(cust)}
                className={`flex items-center justify-between p-3.5 cursor-pointer hover:bg-brand-50/50 transition-colors ${
                  selectedCustomerId === cust.id ? 'bg-brand-50/80 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                    {cust.name ? cust.name.charAt(0) : 'ع'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-surface-900">{cust.name || 'عميل بدون اسم'}</p>
                    <p className="text-[11px] font-mono text-surface-500">{cust.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-surface-600 font-medium">
                    {cust.walletBalance} {t.common.jod}
                  </span>
                  <Badge variant={cust.isSuspended ? 'danger' : 'success'}>
                    {cust.isSuspended ? t.common.inactive : t.common.active}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-surface-400 rtl:rotate-180" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Search Results Dropdown / Preview */}
        {searchMode === 'order' && orderSearchResults && orderSearchResults.length > 0 && (
          <div className="mt-3 divide-y divide-surface-100 bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
            {orderSearchResults.map((ord) => (
              <div
                key={ord.id}
                onClick={() => handleSelectOrder(ord)}
                className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-brand-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-surface-900 font-mono">{ord.id}</p>
                    <p className="text-[11px] text-surface-500">
                      {ord.customerName} ({ord.customerPhone}) - {ord.deliveryArea}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-surface-900 font-mono">
                    {ord.totalAmount.toFixed(2)} د.أ
                  </span>
                  <OrderStatusBadge status={ord.status} />
                  <ChevronRight className="w-4 h-4 text-surface-400 rtl:rotate-180" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Customer 360 Workspace Content */}
      {selectedCustomerId && (
        <div className="space-y-6">
          {isLoadingSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-64 md:col-span-2 rounded-2xl" />
            </div>
          ) : summary ? (
            <>
              {/* Top Customer Info Strip */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-brand-600">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white font-black text-lg flex items-center justify-center shadow-sm">
                      {summary.customer.name ? summary.customer.name.charAt(0) : 'ع'}
                    </div>
                    <div className="overflow-hidden">
                      <h2 className="text-sm font-extrabold text-surface-900 truncate">
                        {summary.customer.name || 'عميل مسجل'}
                      </h2>
                      <p className="text-xs font-mono text-brand-700 font-semibold">{summary.customer.phoneNumber}</p>
                      <Badge variant={summary.customer.isSuspended ? 'danger' : 'success'} className="mt-1">
                        {summary.customer.isSuspended ? t.common.inactive : t.common.active}
                      </Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <p className="text-xs font-semibold text-surface-400">{t.customerService.walletAndPoints}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xl font-extrabold text-surface-900">
                      {summary.customer.walletBalance.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-surface-500">{t.common.jod}</span>
                  </div>
                  <p className="text-xs text-amber-600 font-semibold mt-1">
                    {summary.customer.points} {t.common.points}
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-xs font-semibold text-surface-400">الطلبات المسجلة</p>
                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-xl font-extrabold text-brand-700">
                      {summary.activeOrders.length} نشطة
                    </span>
                    <span className="text-xs font-semibold text-surface-500">
                      / {summary.pastOrders.length} مكتملة
                    </span>
                  </div>
                </Card>

                <Card className="p-5 flex flex-col justify-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setIsNoteModalOpen(true)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                    {t.customerService.addNote}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setIsCaseModalOpen(true)}
                  >
                    <LifeBuoy className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                    {t.customerService.createCaseForCustomer}
                  </Button>
                </Card>
              </div>

              {/* Active Orders Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-5 border-b border-surface-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-brand-600" />
                      {t.customerService.activeOrders} ({summary.activeOrders.length})
                    </h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {summary.activeOrders.length > 0 ? (
                      summary.activeOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 rounded-2xl border border-surface-200 bg-surface-50/50 hover:bg-surface-50 transition-colors space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-extrabold text-brand-700">{ord.id}</span>
                            <OrderStatusBadge status={ord.status} />
                          </div>
                          <div className="text-xs text-surface-700">
                            <p className="font-semibold">{ord.deliveryArea} - {ord.deliveryStreetAddress}</p>
                            <p className="text-[11px] text-surface-500 mt-0.5">
                              المزود: {ord.providerName || 'غير محدد'} | السائق: {ord.assignedDeliveryName || 'بانتظار التعيين'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-surface-200/60">
                            <span className="text-xs font-bold text-surface-900">
                              {ord.totalAmount.toFixed(2)} {t.common.jod}
                            </span>
                            <div className="flex gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="text-[11px] py-1 px-2.5 h-auto"
                                onClick={() => setInspectedOrder(ord)}
                              >
                                معاينة
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="text-[11px] py-1 px-2.5 h-auto text-rose-600 hover:text-rose-700"
                                onClick={() => handleOpenRefundModal(ord)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1 rtl:mr-0 rtl:ml-1" />
                                استرجاع
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-surface-400 py-4 text-center">{t.customerService.noActiveOrders}</p>
                    )}
                  </div>
                </Card>

                {/* Internal Notes Timeline */}
                <Card>
                  <div className="p-5 border-b border-surface-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-600" />
                      {t.customerService.notesTimeline} ({summary.notes.length})
                    </h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => setIsNoteModalOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                      إضافة ملاحظة
                    </Button>
                  </div>
                  <div className="p-5 space-y-3 max-h-[380px] overflow-y-auto">
                    {summary.notes.length > 0 ? (
                      summary.notes.map((n) => (
                        <div key={n.id} className="p-3.5 rounded-xl border border-surface-100 bg-white shadow-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-surface-800 flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-brand-600" />
                              {n.authorName || 'موظف خدمة العملاء'} ({n.authorRole})
                            </span>
                            <span className="text-surface-400 font-mono">
                              {new Date(n.createdAt).toLocaleString('ar-JO')}
                            </span>
                          </div>
                          <p className="text-xs text-surface-700 whitespace-pre-wrap">{n.note}</p>
                          {n.orderId && (
                            <span className="inline-block text-[10px] font-mono text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded mt-1">
                              مرتبط بالطلب: {n.orderId}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-surface-400 py-4 text-center">{t.customerService.noNotes}</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Previous Orders & Support Cases Tabs / Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Past Orders */}
                <Card>
                  <div className="p-5 border-b border-surface-100">
                    <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-surface-500" />
                      {t.customerService.pastOrders} ({summary.pastOrders.length})
                    </h3>
                  </div>
                  <div className="p-5 space-y-2 max-h-[300px] overflow-y-auto">
                    {summary.pastOrders.length > 0 ? (
                      summary.pastOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-surface-100 hover:bg-surface-50 transition-colors text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-surface-900">{ord.id}</span>
                            <p className="text-[11px] text-surface-500">
                              {new Date(ord.createdAt).toLocaleDateString('ar-JO')} - {ord.totalAmount.toFixed(2)} د.أ
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <OrderStatusBadge status={ord.status} />
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-[11px] py-1 px-2 h-auto"
                              onClick={() => setInspectedOrder(ord)}
                            >
                              تفاصيل
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-surface-400 py-4 text-center">{t.customerService.noPastOrders}</p>
                    )}
                  </div>
                </Card>

                {/* Support Cases for this customer */}
                <Card>
                  <div className="p-5 border-b border-surface-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                      <LifeBuoy className="w-4 h-4 text-brand-600" />
                      تذاكر الدعم والشكاوى ({summary.cases.length})
                    </h3>
                  </div>
                  <div className="p-5 space-y-2 max-h-[300px] overflow-y-auto">
                    {summary.cases.length > 0 ? (
                      summary.cases.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl border border-surface-100 hover:bg-surface-50 transition-colors space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-brand-700">{c.caseNumber}</span>
                            <Badge variant={c.status === 'open' ? 'warning' : 'neutral'}>{c.status}</Badge>
                          </div>
                          <p className="font-semibold text-surface-900">{c.title}</p>
                          <p className="text-[11px] text-surface-500 truncate">{c.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-surface-400 py-4 text-center">{t.supportCases.empty}</p>
                    )}
                  </div>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Add Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title={t.customerService.addNote}
      >
        <div className="space-y-4">
          <p className="text-xs text-surface-500">
            تنبيه: الملاحظات الداخلية تحفظ في سجل تدقيق دائم وغير قابلة للتعديل أو الإلغاء.
          </p>
          <textarea
            rows={4}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder={t.customerService.addNotePlaceholder}
            className="w-full p-3 rounded-xl border border-surface-200 text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsNoteModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={!noteContent.trim() || noteMutation.isPending}
              onClick={() =>
                noteMutation.mutate({
                  customerId: selectedCustomerId!,
                  orderId: selectedOrderForNote,
                  note: noteContent,
                })
              }
            >
              {noteMutation.isPending ? t.common.loading : t.common.save}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Support Case Modal */}
      <Modal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        title={t.supportCases.form.createTitle}
      >
        <div className="space-y-4">
          <Input
            label={t.supportCases.form.title}
            value={caseTitle}
            onChange={(e) => setCaseTitle(e.target.value)}
            placeholder="مثال: تأخر استلام جرة الغاز"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                {t.supportCases.form.category}
              </label>
              <Select
                value={caseCategory}
                onChange={(e) => setCaseCategory(e.target.value)}
                options={categoryFormOptions}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                {t.supportCases.form.priority}
              </label>
              <Select
                value={casePriority}
                onChange={(e) => setCasePriority(e.target.value as SupportCasePriority)}
                options={[
                  { value: 'low', label: t.supportCases.priority.low },
                  { value: 'normal', label: t.supportCases.priority.normal },
                  { value: 'high', label: t.supportCases.priority.high },
                  { value: 'urgent', label: t.supportCases.priority.urgent },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              {t.supportCases.form.description}
            </label>
            <textarea
              rows={4}
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              placeholder="اكتب تفاصيل الشكوى..."
              className="w-full p-3 rounded-xl border border-surface-200 text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCaseModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={!caseTitle.trim() || !caseDescription.trim() || caseMutation.isPending}
              onClick={() =>
                caseMutation.mutate({
                  customerId: selectedCustomerId!,
                  orderId: selectedOrderForCase,
                  title: caseTitle,
                  category: caseCategory,
                  description: caseDescription,
                  priority: casePriority,
                })
              }
            >
              {caseMutation.isPending ? t.common.loading : t.supportCases.form.save}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Request Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title={t.refunds.form.createTitle}
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            طلب رقم: <span className="font-mono font-bold">{selectedOrderForRefund?.id}</span> | القيمة الإجمالية: <span className="font-bold">{selectedOrderForRefund?.totalAmount} د.أ</span>
          </div>
          <Input
            label={t.refunds.form.amount}
            type="number"
            step="0.5"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder="0.00"
          />
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              {t.refunds.form.reason}
            </label>
            <textarea
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="اذكر سبب طلب الاسترجاع بالتفصيل..."
              className="w-full p-3 rounded-xl border border-surface-200 text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsRefundModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={!refundAmount || !refundReason.trim() || refundMutation.isPending}
              onClick={() =>
                refundMutation.mutate({
                  orderId: selectedOrderForRefund!.id,
                  amount: parseFloat(refundAmount),
                  reason: refundReason,
                  notes: refundNotes,
                })
              }
            >
              {refundMutation.isPending ? t.common.loading : t.refunds.form.submit}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Order Details Drawer / Modal */}
      {inspectedOrder && (
        <Modal
          isOpen={!!inspectedOrder}
          onClose={() => setInspectedOrder(null)}
          title={`معاينة تفاصيل الطلب (${inspectedOrder.id})`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
              <div>
                <p className="font-bold text-surface-900">{inspectedOrder.customerName}</p>
                <p className="text-surface-500 font-mono">{inspectedOrder.customerPhone}</p>
              </div>
              <OrderStatusBadge status={inspectedOrder.status} />
            </div>

            <div>
              <h4 className="font-bold text-surface-900 mb-2">العناصر والخدمات:</h4>
              <div className="divide-y divide-surface-100 border border-surface-100 rounded-xl overflow-hidden">
                {inspectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5">
                    <span>{item.titleAr} (x{item.quantity})</span>
                    <span className="font-bold">{item.itemTotal.toFixed(2)} د.أ</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-brand-900">
                <span>المبلغ الإجمالي:</span>
                <span>{inspectedOrder.totalAmount.toFixed(2)} د.أ</span>
              </div>
              <div className="flex justify-between text-[11px] text-surface-500">
                <span>رسوم التوصيل:</span>
                <span className="text-emerald-600 font-bold">0.00 د.أ (مجاني)</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setInspectedOrder(null)}>
                {t.common.close || 'إغلاق'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
