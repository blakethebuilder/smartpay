'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { customerApi } from '@/lib/api';
import { DataTable, Spinner, EmptyState } from '@/components/ui';
import DashboardLayout from '@/components/DashboardLayout';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Search, Users, Phone, Mail } from 'lucide-react';

export default function CustomersPage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useRequireAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    fetchCustomers();
  }, [isReady, isAuthenticated, page]);

  const fetchCustomers = async () => {
    try {
      const response = await customerApi.list(page);
      setCustomers(response.data.customers || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (item: any) => (
        <div className="flex items-center">
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-green-600">{item.name.charAt(0)}</span>
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900">{item.name}</p>
            {item.email && <p className="text-sm text-gray-500">{item.email}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (item: any) => (
        <span className="text-gray-600">{item.phone}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (item: any) => (
        <span className="text-gray-500">{formatDate(item.createdAt)}</span>
      ),
    },
  ];

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Customers">
        <Spinner size="lg" className="py-20" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Customers"
      subtitle="Manage your customer database"
      actions={
        <Link
          href="/customers/new"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Link>
      }
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredCustomers}
        columns={columns}
        onRowClick={(item) => router.push(`/customers/${item.id}`)}
        emptyMessage="No customers yet. Add your first customer to get started."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
