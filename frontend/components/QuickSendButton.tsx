'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { customerApi, invoiceApi, whatsappApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Modal, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { Send, Link2, MessageSquare, X } from 'lucide-react';

interface QuickSendProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSendButton({ isOpen, onClose }: QuickSendProps) {
  const { token } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [whatsappInstances, setWhatsappInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('');
  const [selectedInstance, setSelectedInstance] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedCustomer || !amount || !selectedGateway) {
      toast.error('Please fill in all required fields');
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
        gateway: selectedGateway,
      });

      // Send via WhatsApp if instance selected
      if (selectedInstance) {
        const customer = customers.find((c) => c.id === selectedCustomer);
        const message = `Hi ${customer?.name},\n\nPlease make a payment of ${formatCurrency(parseFloat(amount))}.\n\nDescription: ${description || 'Payment request'}\n\nPay here: ${linkRes.data.paymentUrl}\n\nThank you!`;

        await whatsappApi.sendMessage({
          instanceId: selectedInstance,
          customerId: selectedCustomer,
          content: message,
        });

        toast.success('Payment link sent via WhatsApp!');
      } else {
        toast.success('Invoice created! Copy the link to share.');
      }

      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setAmount('');
    setDescription('');
    setSelectedGateway('');
    setSelectedInstance('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Payment Request" maxWidth="max-w-xl">
      {loading ? (
        <div className="py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>

          {/* Amount & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ZAR) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Invoice for..."
              />
            </div>
          </div>

          {/* Gateway */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <div className="grid grid-cols-2 gap-2">
              {gateways
                .filter((g) => g.status === 'live')
                .map((gateway) => (
                  <button
                    key={gateway.id}
                    onClick={() => setSelectedGateway(gateway.id)}
                    className={`p-3 border-2 rounded-lg text-left text-sm ${
                      selectedGateway === gateway.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">{gateway.name}</p>
                    <p className="text-xs text-gray-500">{gateway.description}</p>
                  </button>
                ))}
            </div>
          </div>

          {/* WhatsApp */}
          {whatsappInstances.some((i) => i.status === 'open' || i.status === 'connected') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MessageSquare className="inline h-4 w-4 mr-1" />
                Send via WhatsApp (optional)
              </label>
              <select
                value={selectedInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Don't send via WhatsApp</option>
                {whatsappInstances
                  .filter((i) => i.status === 'open' || i.status === 'connected')
                  .map((i) => (
                    <option key={i.id} value={i.id}>{i.instanceName}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!selectedCustomer || !amount || !selectedGateway || sending}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center"
            >
              {sending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {selectedInstance ? 'Create & Send' : 'Create Invoice'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
