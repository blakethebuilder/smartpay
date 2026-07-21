'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { invoiceApi, customerApi, whatsappApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard, StatusBadge, Spinner } from '@/components/ui';
import DashboardLayout from '@/components/DashboardLayout';
import {
  FileText,
  Users,
  CreditCard,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingAmount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { tenant, token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingAmount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, [token, router]);

  const fetchDashboardData = async () => {
    try {
      const [invoicesRes, customersRes, whatsappRes] = await Promise.all([
        invoiceApi.list(1, ''),
        customerApi.list(1, 5),
        whatsappApi.listInstances().catch(() => ({ data: [] })),
      ]);

      const invoices = invoicesRes.data.invoices || [];
      const customers = customersRes.data.customers || [];
      const instances = whatsappRes.data || [];

      const paid = invoices.filter((i: any) => i.status === 'paid');
      const pending = invoices.filter((i: any) => i.status === 'pending');

      setStats({
        totalInvoices: invoicesRes.data.pagination?.total || invoices.length,
        paidInvoices: paid.length,
        pendingInvoices: pending.length,
        totalCustomers: customersRes.data.pagination?.total || customers.length,
        totalRevenue: paid.reduce((sum: number, i: any) => sum + i.amount, 0),
        pendingAmount: pending.reduce((sum: number, i: any) => sum + i.amount, 0),
      });

      setRecentInvoices(invoices.slice(0, 5));
      setRecentCustomers(customers.slice(0, 5));
      setWhatsappStatus(
        instances.some((i: any) => i.status === 'open' || i.status === 'connected')
          ? 'connected'
          : 'disconnected'
      );
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <Spinner size="lg" className="py-20" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Welcome back, ${tenant?.name}`}
      actions={
        <Link
          href="/invoices/new"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <FileText className="h-4 w-4 mr-2" />
          New Invoice
        </Link>
      }
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
        />
        <StatCard
          title="Pending"
          value={formatCurrency(stats.pendingAmount)}
          change={`${stats.pendingInvoices} invoice${stats.pendingInvoices !== 1 ? 's' : ''}`}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
        />
        <StatCard
          title="Paid"
          value={stats.paidInvoices.toString()}
          change={`${stats.totalInvoices} total`}
          changeType="positive"
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
        />
        <StatCard
          title="Customers"
          value={stats.totalCustomers.toString()}
          icon={<Users className="h-6 w-6 text-green-600" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/invoices/new"
          className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-200 hover:shadow-md transition-all"
        >
          <div className="p-3 bg-green-50 rounded-lg">
            <FileText className="h-5 w-5 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900">Create Invoice</p>
            <p className="text-sm text-gray-500">Bill your customers</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto" />
        </Link>

        <Link
          href="/customers/new"
          className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-200 hover:shadow-md transition-all"
        >
          <div className="p-3 bg-blue-50 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900">Add Customer</p>
            <p className="text-sm text-gray-500">Grow your network</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto" />
        </Link>

        <Link
          href="/whatsapp"
          className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-green-200 hover:shadow-md transition-all"
        >
          <div className="p-3 bg-purple-50 rounded-lg">
            <MessageSquare className="h-5 w-5 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900">WhatsApp</p>
            <p className="text-sm text-gray-500">
              {whatsappStatus === 'connected' ? 'Connected' : 'Connect now'}
            </p>
          </div>
          <div className="ml-auto">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                whatsappStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </div>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
            <Link href="/invoices" className="text-sm text-green-600 hover:text-green-700">
              View all
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No invoices yet. Create your first invoice to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{invoice.description || 'Invoice'}</p>
                    <p className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </p>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Customers</h3>
            <Link href="/customers" className="text-sm text-green-600 hover:text-green-700">
              View all
            </Link>
          </div>
          {recentCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No customers yet. Add your first customer.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentCustomers.map((customer) => (
                <div key={customer.id} className="px-6 py-4 flex items-center">
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-green-600">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-3 overflow-hidden">
                    <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                    <p className="text-sm text-gray-500 truncate">{customer.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
