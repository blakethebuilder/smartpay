'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/hooks';
import { customerApi, invoiceApi } from '@/lib/api';
import { Modal } from '@/components/ui';
import toast from 'react-hot-toast';
import { Send, Zap, Check } from 'lucide-react';

interface QuickSendProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSend({ isOpen, onClose }: QuickSendProps) {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen && isReady && isAuthenticated) {
      fetchCustomers();
    }
  }, [isOpen, isReady, isAuthenticated]);

  const fetchCustomers = async () => {
    try {
      const res = await customerApi.list(1, 100);
      setCustomers(res.data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setAmount('');
    setDescription('');
    setSent(false);
    setPaymentUrl('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSend = async () => {
    if (!selectedCustomer) {
      toast.error('Select a customer');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter an amount');
      return;
    }

    setSending(true);
    try {
      // Create invoice
      const invoiceRes = await invoiceApi.create({
        customerId: selectedCustomer,
        amount: parseFloat(amount),
        currency: 'ZAR',
        description: description || 'Payment request',
      });

      // Generate payment link
      const linkRes = await invoiceApi.createPaymentLink({
        invoiceId: invoiceRes.data.id,
        gateway: 'paystack',
      });

      setPaymentUrl(linkRes.data.paymentUrl);
      setSent(true);
      toast.success('Payment link created!');

      // Copy to clipboard
      navigator.clipboard.writeText(linkRes.data.paymentUrl);
      toast.success('Link copied to clipboard!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create');
    } finally {
      setSending(false);
    }
  };

  const selectedCustomerData = customers.find((c) => c.id === selectedCustomer);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" maxWidth="max-w-sm">
      {!sent ? (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Send</h3>
            <p className="text-sm text-gray-500">Create invoice + payment link in one shot</p>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ZAR) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2.5 text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !selectedCustomer || !amount}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {sending ? (
              <span className="flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Creating...
              </span>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Payment Link
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Link Created!</h3>
          <p className="text-sm text-gray-500">
            Payment link copied to clipboard. Paste it in WhatsApp to send to {selectedCustomerData?.name}.
          </p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 truncate">{paymentUrl}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
