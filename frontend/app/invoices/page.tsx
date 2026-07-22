'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { useAuthStore } from '@/lib/store';
import { invoiceApi, customerApi, api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable, StatusBadge, Spinner, Modal } from '@/components/ui';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Plus,
  Upload,
  ExternalLink,
  Send,
  Search,
  Filter,
  FileText,
  Link2,
  Trash2,
} from 'lucide-react';

export default function InvoicesPage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useRequireAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Payment link modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [gateways, setGateways] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    fetchData();
  }, [isReady, isAuthenticated, page, statusFilter]);

  const fetchData = async () => {
    try {
      const [invoicesRes, customersRes, gatewaysRes] = await Promise.all([
        invoiceApi.list(page, statusFilter || undefined),
        customerApi.list(1, 100),
        invoiceApi.getGateways(),
      ]);
      setInvoices(invoicesRes.data.invoices || []);
      setCustomers(customersRes.data.customers || []);
      setGateways(gatewaysRes.data || []);
      setTotalPages(invoicesRes.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const response = await invoiceApi.createPaymentLink({
        invoiceId: selectedInvoice.id,
        gateway: selectedGateway,
      });
      setPaymentLink(response.data.paymentUrl);
      toast.success('Payment link generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate link');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${invoiceId}`);
      toast.success('Invoice deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete invoice');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    toast.success('Link copied to clipboard!');
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || 'Unknown';
  };

  const columns = [
    {
      key: 'description',
      header: 'Invoice',
      render: (item: any) => (
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-gray-400 mr-3" />
          <div>
            <p className="font-medium text-gray-900">{item.description || 'Invoice'}</p>
            <p className="text-xs text-gray-500">{getCustomerName(item.customerId)}</p>
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
      key: 'actions',
      header: '',
      render: (item: any) => (
        <div className="flex items-center space-x-2">
          {item.status === 'pending' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInvoice(item);
                setSelectedGateway('');
                setPaymentLink('');
                setShowPaymentModal(true);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
            >
              <Link2 className="h-3.5 w-3.5 mr-1" />
              Get Link
            </button>
          )}
          {item.status !== 'paid' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteInvoice(item.id);
              }}
              className="inline-flex items-center px-2 py-1.5 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.description?.toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(inv.customerId).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Invoices">
        <Spinner size="lg" className="py-20" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Invoices"
      subtitle="Manage your invoices and payment links"
      actions={
        <div className="flex space-x-3">
          <Link
            href="/invoices/upload"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Link>
          <Link
            href="/invoices/new"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Link>
        </div>
      }
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex space-x-2">
          {['', 'pending', 'paid', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredInvoices}
        columns={columns}
        onRowClick={(item) => router.push(`/invoices/${item.id}`)}
        emptyMessage="No invoices found. Create your first invoice to get started."
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

      {/* Payment Link Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoice(null);
          setPaymentLink('');
        }}
        title="Generate Payment Link"
      >
        <div className="space-y-4">
          {selectedInvoice && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice</span>
                <span className="font-medium text-gray-900">{selectedInvoice.description || 'Invoice'}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">Customer</span>
                <span className="text-gray-900">{getCustomerName(selectedInvoice.customerId)}</span>
              </div>
            </div>
          )}

          {!paymentLink ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Payment Method</label>
                <div className="space-y-2">
                  {gateways
                    .filter((g) => g.status === 'live')
                    .map((gateway) => (
                      <button
                        key={gateway.id}
                        onClick={() => setSelectedGateway(gateway.id)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                          selectedGateway === gateway.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{gateway.name}</p>
                            <p className="text-sm text-gray-500">{gateway.description}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedGateway === gateway.id
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {selectedGateway === gateway.id && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateLink}
                  disabled={!selectedGateway || generating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Link'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Link2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">Payment link generated!</p>
                    <p className="text-xs text-green-600 mt-1">Share this link with your customer to collect payment.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Link</label>
                <div className="flex">
                  <input
                    type="text"
                    value={paymentLink}
                    readOnly
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 bg-green-600 text-white rounded-r-lg hover:bg-green-700 font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                    setPaymentLink('');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
