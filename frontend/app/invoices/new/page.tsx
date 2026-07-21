'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { invoiceApi, customerApi, whatsappApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Spinner } from '@/components/ui';
import { ArrowLeft, FileText, Send, Link2 } from 'lucide-react';
import Link from 'next/link';

const invoiceSchema = z.object({
  customerId: z.string().uuid('Please select a customer'),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('ZAR'),
  description: z.string().min(1, 'Description is required').max(500),
  dueDate: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [gateways, setGateways] = useState<any[]>([]);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false);
  const [whatsappInstances, setWhatsappInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { currency: 'ZAR' },
  });

  const watchAmount = watch('amount');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, gatewaysRes, whatsappRes] = await Promise.all([
        customerApi.list(1, 100),
        invoiceApi.getGateways(),
        whatsappApi.listInstances().catch(() => ({ data: [] })),
      ]);
      setCustomers(customersRes.data.customers || []);
      setGateways(gatewaysRes.data || []);
      setWhatsappInstances(whatsappRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    try {
      const invoice = await invoiceApi.create(data);
      setCreatedInvoice(invoice.data);
      toast.success('Invoice created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!createdInvoice || !selectedGateway) return;
    setGeneratingLink(true);
    try {
      const response = await invoiceApi.createPaymentLink({
        invoiceId: createdInvoice.id,
        gateway: selectedGateway,
      });
      setPaymentLink(response.data.paymentUrl);
      toast.success('Payment link generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleSendViaWhatsApp = async () => {
    if (!paymentLink || !selectedInstance) return;
    try {
      const customer = customers.find((c) => c.id === createdInvoice.customerId);
      if (!customer) {
        toast.error('Customer not found');
        return;
      }

      const message = `Hi ${customer.name},\n\nPlease find your payment link below:\n\nAmount: R ${createdInvoice.amount.toLocaleString()}\nDescription: ${createdInvoice.description}\n\nPay here: ${paymentLink}\n\nThank you for your business!`;

      await whatsappApi.sendMessage({
        instanceId: selectedInstance,
        customerId: customer.id,
        content: message,
      });

      toast.success('Payment link sent via WhatsApp!');
      router.push('/invoices');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    toast.success('Link copied to clipboard!');
  };

  if (!createdInvoice) {
    return (
      <DashboardLayout title="Create Invoice" subtitle="Create a new invoice for your customer">
        <div className="max-w-2xl">
          <Link href="/invoices" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to invoices
          </Link>

          <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                {...register('customerId')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name} ({customer.phone})</option>
                ))}
              </select>
              {errors.customerId && <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>}
              {customers.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  No customers yet. <Link href="/customers/new" className="text-green-600 hover:underline">Add one</Link>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                  <input
                    {...register('amount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  {...register('currency')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="ZAR">ZAR (South African Rand)</option>
                  <option value="NGN">NGN (Nigerian Naira)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input
                {...register('description')}
                type="text"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Premium Subscription - Monthly"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
              <input
                {...register('dueDate')}
                type="date"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Link
                href="/invoices"
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    );
  }

  // After invoice is created - show payment link options
  return (
    <DashboardLayout title="Invoice Created" subtitle="Now generate a payment link to share with your customer">
      <div className="max-w-2xl">
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">{createdInvoice.description}</h3>
              <p className="text-2xl font-bold text-gray-900">R {createdInvoice.amount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {!paymentLink ? (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Generate Payment Link</h3>

            <div className="space-y-3 mb-6">
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

            <button
              onClick={handleGenerateLink}
              disabled={!selectedGateway || generatingLink}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              {generatingLink ? 'Generating...' : 'Generate Payment Link'}
            </button>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <Link2 className="h-5 w-5 text-green-600" />
                <p className="ml-2 font-medium text-green-800">Payment link ready!</p>
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

            {/* WhatsApp send option */}
            {whatsappInstances.some((i) => i.status === 'open' || i.status === 'connected') && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="sendWhatsApp"
                    checked={sendViaWhatsApp}
                    onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                  <label htmlFor="sendWhatsApp" className="ml-2 text-sm font-medium text-gray-700">
                    Send via WhatsApp
                  </label>
                </div>

                {sendViaWhatsApp && (
                  <div className="mt-3">
                    <select
                      value={selectedInstance}
                      onChange={(e) => setSelectedInstance(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select WhatsApp instance</option>
                      {whatsappInstances
                        .filter((i) => i.status === 'open' || i.status === 'connected')
                        .map((instance) => (
                          <option key={instance.id} value={instance.id}>
                            {instance.instanceName}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setPaymentLink('');
                  setSelectedGateway('');
                  setSendViaWhatsApp(false);
                }}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Generate Another
              </button>
              {sendViaWhatsApp && selectedInstance ? (
                <button
                  onClick={handleSendViaWhatsApp}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send via WhatsApp
                </button>
              ) : (
                <button
                  onClick={() => router.push('/invoices')}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
