'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { DataTable, StatusBadge, Spinner, Modal } from '@/components/ui';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, CreditCard, ExternalLink } from 'lucide-react';

export default function PaymentsPage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useRequireAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchPayments();
  }, [token, router]);

  const fetchPayments = async () => {
    try {
      // Get all invoices and flatten their payments
      const invoicesRes = await api.get('/invoices?page=1&limit=100');
      const invoices = invoicesRes.data.invoices || [];

      // For now, show invoice payment status as a proxy
      const paymentData = invoices.map((inv: any) => ({
        id: inv.id,
        description: inv.description || 'Invoice',
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        createdAt: inv.createdAt,
        paidAt: inv.paidAt,
      }));

      setPayments(paymentData);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'description',
      header: 'Payment',
      render: (item: any) => (
        <div className="flex items-center">
          <div className="p-2 bg-green-50 rounded-lg">
            <CreditCard className="h-4 w-4 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900">{item.description}</p>
            <p className="text-xs text-gray-500">{item.id.substring(0, 8)}...</p>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(item.amount, item.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (item: any) => (
        <span className="text-gray-500">{formatDate(item.createdAt)}</span>
      ),
    },
    {
      key: 'paidAt',
      header: 'Paid',
      render: (item: any) => (
        <span className="text-gray-500">{item.paidAt ? formatDateTime(item.paidAt) : '-'}</span>
      ),
    },
  ];

  const filteredPayments = payments.filter(
    (p) =>
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Payments">
        <Spinner size="lg" className="py-20" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Payments"
      subtitle="Track all payment transactions"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(
              payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(
              payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(
              payments.filter((p) => p.status === 'failed').reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredPayments}
        columns={columns}
        onRowClick={(item) => setSelectedPayment(item)}
        emptyMessage="No payment records yet."
      />
    </DashboardLayout>
  );
}
