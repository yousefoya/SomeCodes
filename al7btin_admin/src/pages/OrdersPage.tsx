import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';
import { Order, OrderStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { OrderStatusBadge } from '../components/shared/OrderStatusBadge';
import { SearchInput } from '../components/shared/SearchInput';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { ShoppingBag, Eye, RefreshCw, MapPin, User as UserIcon, Store, Clock } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('confirmed');
  const [statusNotes, setStatusNotes] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-orders', { page, search, status: statusFilter }],
    queryFn: () =>
      ordersApi.getOrders({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: OrderStatus; notes?: string }) =>
      ordersApi.updateStatus(id, status, notes),
    onSuccess: (updated) => {
      success('تم تحديث حالة الطلب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedOrder(updated);
      setIsDetailOpen(false);
    },
    onError: (err: Error) => {
      toastError(err.message || 'فشل تحديث حالة الطلب.');
    },
  });

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusNotes('');
    setIsDetailOpen(true);
  };

  const handleUpdateStatus = () => {
    if (!selectedOrder) return;
    updateStatusMutation.mutate({
      id: selectedOrder.id,
      status: newStatus,
      notes: statusNotes || undefined,
    });
  };

  const statusOptions = [
    { value: 'all', label: t.orders.allStatuses },
    { value: 'pending', label: t.orders.status.pending },
    { value: 'confirmed', label: t.orders.status.confirmed },
    { value: 'offered_to_driver', label: t.orders.status.offered_to_driver },
    { value: 'awaiting_assignment', label: t.orders.status.awaiting_assignment },
    { value: 'assigned', label: t.orders.status.assigned },
    { value: 'accepted', label: t.orders.status.accepted },
    { value: 'going_to_pickup', label: t.orders.status.going_to_pickup },
    { value: 'picked_up', label: t.orders.status.picked_up },
    { value: 'going_to_customer', label: t.orders.status.going_to_customer },
    { value: 'completed', label: t.orders.status.completed },
    { value: 'cancelled', label: t.orders.status.cancelled },
    { value: 'rejected', label: t.orders.status.rejected },
  ];

  const modalStatusOptions = [
    { value: 'pending', label: t.orders.status.pending },
    { value: 'confirmed', label: t.orders.status.confirmed },
    { value: 'accepted', label: t.orders.status.accepted },
    { value: 'going_to_pickup', label: t.orders.status.going_to_pickup },
    { value: 'picked_up', label: t.orders.status.picked_up },
    { value: 'going_to_customer', label: t.orders.status.going_to_customer },
    { value: 'completed', label: t.orders.status.completed },
    { value: 'cancelled', label: t.orders.status.cancelled },
    { value: 'rejected', label: t.orders.status.rejected },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
            {t.orders.title}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">{t.orders.subtitle}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          {t.common.refresh}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-surface-200/80 shadow-card">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder={t.orders.searchPlaceholder}
        />
        <div className="w-full sm:w-56">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Main Table */}
      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-surface-200/80 p-4">
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : !data?.orders || data.orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12 text-surface-300" />}
          title={t.orders.empty}
          description="لم يتم العثور على أي طلبات مسجلة في قاعدة البيانات وفق معايير التصفية المحددة."
        />
      ) : (
        <div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t.orders.table.orderId}</TableHeaderCell>
                <TableHeaderCell>{t.orders.table.customer}</TableHeaderCell>
                <TableHeaderCell>{t.orders.table.provider}</TableHeaderCell>
                <TableHeaderCell>{t.orders.table.deliveryArea}</TableHeaderCell>
                <TableHeaderCell>{t.orders.table.total}</TableHeaderCell>
                <TableHeaderCell>{t.orders.table.status}</TableHeaderCell>
                <TableHeaderCell>{t.orders.table.date}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t.orders.table.actions}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.orders.map((order) => (
                <TableRow key={order.id} onClick={() => handleOpenDetails(order)}>
                  <TableCell className="font-mono text-xs font-bold text-brand-700">
                    {order.id}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-surface-900 block">{order.customerName}</span>
                    <span className="text-[10px] text-surface-400 font-mono">{order.customerPhone}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {order.providerName ? (
                      <span className="font-medium text-surface-800">{order.providerName}</span>
                    ) : (
                      <span className="text-surface-400">توزيع تلقائي</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{order.deliveryArea}</TableCell>
                  <TableCell className="font-bold text-surface-900 text-xs">
                    {order.totalAmount.toFixed(2)} {t.common.jod}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} size="sm" />
                  </TableCell>
                  <TableCell className="text-[11px] text-surface-400">
                    {new Date(order.createdAt).toLocaleDateString('ar-JO', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetails(order);
                      }}
                      icon={<Eye className="w-3.5 h-3.5 text-brand-600" />}
                    >
                      {t.common.view}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            currentPage={data.page}
            totalPages={data.totalPages}
            totalItems={data.total}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`${t.orders.detailsModal.orderNumber} ${selectedOrder.id}`}
          subtitle={`تاريخ الإنشاء: ${new Date(selectedOrder.createdAt).toLocaleString('ar-JO')}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            {/* Current Status Banner */}
            <div className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl border border-surface-200">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-surface-500" />
                <div>
                  <span className="text-[11px] text-surface-500 block">حالة الطلب الحالية:</span>
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="text-right ltr:text-left">
                <span className="text-[11px] text-surface-500 block">طريقة الدفع:</span>
                <span className="font-bold text-surface-800">
                  {selectedOrder.paymentMethod === 'cash_on_delivery' ? 'الدفع نقداً عند الاستلام' : selectedOrder.paymentMethod}
                </span>
              </div>
            </div>

            {/* Customer & Delivery Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-50/70 rounded-2xl border border-surface-200/80 space-y-2">
                <h4 className="font-bold text-surface-900 flex items-center gap-1.5 text-xs text-brand-700">
                  <UserIcon className="w-3.5 h-3.5" />
                  {t.orders.detailsModal.customerInfo}
                </h4>
                <p><span className="text-surface-500">الاسم:</span> <span className="font-semibold text-surface-900">{selectedOrder.customerName}</span></p>
                <p><span className="text-surface-500">الهاتف:</span> <span className="font-mono text-surface-900">{selectedOrder.customerPhone}</span></p>
              </div>

              <div className="p-4 bg-surface-50/70 rounded-2xl border border-surface-200/80 space-y-2">
                <h4 className="font-bold text-surface-900 flex items-center gap-1.5 text-xs text-brand-700">
                  <MapPin className="w-3.5 h-3.5" />
                  {t.orders.detailsModal.deliveryAddress}
                </h4>
                <p><span className="text-surface-500">المدينة / المنطقة:</span> <span className="font-semibold text-surface-900">{selectedOrder.deliveryCity} - {selectedOrder.deliveryArea}</span></p>
                <p><span className="text-surface-500">الشارع:</span> <span className="text-surface-900">{selectedOrder.deliveryStreetAddress}</span></p>
                {selectedOrder.deliveryBuilding && (
                  <p><span className="text-surface-500">البناية / الشقة:</span> <span className="text-surface-900">{selectedOrder.deliveryBuilding} / شقة {selectedOrder.deliveryApartment || '-'}</span></p>
                )}
                {selectedOrder.destinationAddress && (
                  <div className="mt-2 pt-2 border-t border-surface-200">
                    <p className="text-brand-700 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-brand-600" />
                      <span>وجهة نقل المركبة:</span>
                    </p>
                    <p className="text-surface-800 font-medium">{selectedOrder.destinationAddress}</p>
                    {selectedOrder.tripDistanceKm && (
                      <p className="text-surface-500 text-[11px] mt-0.5 font-mono">
                        المسافة المقدرة للرحلة: <span className="font-bold text-brand-700">{selectedOrder.tripDistanceKm} كم</span>
                      </p>
                    )}
                  </div>
                )}
                {selectedOrder.notes && (
                  <p className="text-amber-700 bg-amber-50 p-2 rounded-lg mt-2"><span className="font-semibold">ملاحظات:</span> {selectedOrder.notes}</p>
                )}
              </div>
            </div>

            {/* Cancellation Notice if applicable */}
            {selectedOrder.status === 'cancelled' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs text-rose-700">
                  <span>تم إلغاء هذا الطلب</span>
                  {selectedOrder.cancelledAt && (
                    <span className="text-[11px] font-normal text-rose-500">
                      ({new Date(selectedOrder.cancelledAt).toLocaleString('ar-JO')})
                    </span>
                  )}
                </div>
                {selectedOrder.cancellationReason && (
                  <p className="text-xs text-rose-900">
                    <span className="font-semibold">سبب الإلغاء:</span> {selectedOrder.cancellationReason}
                  </p>
                )}
              </div>
            )}

            {/* Provider Info */}
            {selectedOrder.providerName && (
              <div className="p-4 bg-surface-50/70 rounded-2xl border border-surface-200/80 space-y-1">
                <h4 className="font-bold text-surface-900 flex items-center gap-1.5 text-xs text-brand-700">
                  <Store className="w-3.5 h-3.5" />
                  {t.orders.detailsModal.providerInfo}
                </h4>
                <p><span className="text-surface-500">المزود:</span> <span className="font-semibold text-surface-900">{selectedOrder.providerName}</span></p>
                {selectedOrder.providerPhone && (
                  <p><span className="text-surface-500">هاتف المزود:</span> <span className="font-mono text-surface-900">{selectedOrder.providerPhone}</span></p>
                )}
                {selectedOrder.pickupAddress && (
                  <p><span className="text-surface-500">موقع المزود:</span> <span className="text-surface-900">{selectedOrder.pickupAddress}</span></p>
                )}
              </div>
            )}

            {/* Line Items Table */}
            <div>
              <h4 className="font-bold text-surface-900 mb-2">{t.orders.detailsModal.items}</h4>
              <div className="rounded-xl border border-surface-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-surface-100/70 text-surface-600 font-semibold border-b border-surface-200">
                    <tr>
                      <th className="py-2.5 px-3 text-right ltr:text-left">{t.orders.detailsModal.itemTitle}</th>
                      <th className="py-2.5 px-3 text-center">{t.orders.detailsModal.quantity}</th>
                      <th className="py-2.5 px-3 text-right ltr:text-left">{t.orders.detailsModal.unitPrice}</th>
                      <th className="py-2.5 px-3 text-right ltr:text-left">{t.orders.detailsModal.total}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-50/50">
                        <td className="py-2.5 px-3 font-medium text-surface-900">
                          {item.titleAr}
                          {item.variantNameAr && (
                            <span className="block text-[10px] text-surface-400">
                              الخيار: {item.variantNameAr}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-surface-800">{item.quantity}</td>
                        <td className="py-2.5 px-3 font-mono">{item.unitPrice.toFixed(2)} {t.common.jod}</td>
                        <td className="py-2.5 px-3 font-bold text-brand-700 font-mono">{item.itemTotal.toFixed(2)} {t.common.jod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-surface-600">
                <span>{t.orders.detailsModal.subtotal}:</span>
                <span className="font-mono">{selectedOrder.subtotal.toFixed(2)} {t.common.jod}</span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>{t.orders.detailsModal.discount}:</span>
                  <span className="font-mono">-{selectedOrder.discountAmount.toFixed(2)} {t.common.jod}</span>
                </div>
              )}
              <div className="flex justify-between text-surface-600">
                <span>{t.orders.detailsModal.deliveryFee}:</span>
                <span className="font-mono font-bold text-emerald-600">0.00 {t.common.jod} (مجاني)</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-surface-900 border-t border-brand-200/60 pt-2 mt-2">
                <span>{t.orders.detailsModal.grandTotal}:</span>
                <span className="text-brand-700 font-mono">{selectedOrder.totalAmount.toFixed(2)} {t.common.jod}</span>
              </div>
            </div>

            {/* Status Update Action */}
            <div className="p-4 bg-surface-50 rounded-2xl border border-surface-200 space-y-3">
              <h4 className="font-bold text-surface-900 flex items-center gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
                {t.orders.detailsModal.updateStatus}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  options={modalStatusOptions}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                />
                <input
                  type="text"
                  placeholder="ملاحظات التحديث (اختياري)..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="rounded-xl border border-surface-300 bg-white py-2 px-3 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdateStatus}
                  isLoading={updateStatusMutation.isPending}
                  disabled={newStatus === selectedOrder.status}
                >
                  {t.orders.detailsModal.updateAction}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
