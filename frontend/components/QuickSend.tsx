'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/hooks';
import { customerApi, invoiceApi, whatsappApi } from '@/lib/api';
import { Modal } from '@/components/ui';
import toast from 'react-hot-toast';
import { Send, User, DollarSign, MessageSquare, Zap } from 'lucide-react';

interface QuickSendProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSend({ isOpen, onClose }: QuickSendProps) {
  const { isReady, isAuthenticated } = useRequireAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [instances, setInstances] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && isReady && isAuthenticated) {
      fetchData();
    }
  }, [isOpen, isReady, isAuthenticated]);

  const fetchData = async () => {
    try {
      const [customersRes, instancesRes] = await Promise.all([
        customerApi.list(1, 100),
        whatsappApi.listInstances().catch(() => ({ data: [] })),
      ]);
      setCustomers(customersRes.data.customers || []);
      setInstances(instancesRes.data || []);
      if (instancesRes.data?.length === 1) {
        setInstanceId(instancesRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setIsNewCustomer(false);
    setAmount('');
    setDescription('');
    setInstanceId('');
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter an amount');
      return;
    }

    setSending(true);
    try {
      let customerId = selectedCustomer;

      // Create new customer if needed
      if (isNewCustomer && newCustomerName && newCustomerPhone) {
        const customerRes = await customerApi.create({
          name: newCustomerName,
          phone: newCustomerPhone,
        });
        customerId = customerRes.data.id;
      }

      if (!customerId) {
        toast.error('Select or create a customer');
        setSending(false);
        return;
      }

      // Create invoice
      const invoiceRes = await invoiceApi.create({
        customerId,
        amount: parseFloat(amount),
        currency: 'ZAR',
        description: description || 'Payment request',
      });

      // Generate payment link
      const linkRes = await invoiceApi.createPaymentLink({
        invoiceId: invoiceRes.data.id,
        gateway: 'paystack', // Default for now
      });

      // Send via WhatsApp if instance selected
      if (instanceId) {
        const customer = customers.find((c) => c.id === customerId) || { name: newCustomerName };
        const message = `Hi ${customer.name}! 👋\n\nYour invoice for *R${parseFloat(amount).toFixed(2)}* is ready.\n\nPay here: ${linkRes.data.paymentUrl}\n\nThank you! 🙏`;

        await whatsappApi.sendMessage({
          instanceId,
          customerId,
          content: message,
        });
        toast.success('Payment link sent via WhatsApp!');
      } else {
        toast.success('Invoice created! Copy the link to share.');
      }

      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quick Send Payment Link" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Step 1: Customer */}
        {step === 1 && (
          <>
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <span>Who is this for?</span>
            </div>

            <div className="flex space-x-2 mb-3">
              <button
                onClick={() => setIsNewCustomer(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                  !isNewCustomer ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                Existing Customer
              </button>
              <button
                onClick={() => setIsNewCustomer(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                  isNewCustomer ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                New Customer
              </button>
            </div>

            {!isNewCustomer ? (
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
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone number (+27...)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}

            <button
              onClick={() => {
                if (isNewCustomer && newCustomerName && newCustomerPhone) setStep(2);
                else if (!isNewCustomer && selectedCustomer) setStep(2);
                else toast.error('Please select or enter a customer');
              }}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Next
            </button>
          </>
        )}

        {/* Step 2: Amount */}
        {step === 2 && (
          <>
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <span>How much?</span>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-3 text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>

            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (amount && parseFloat(amount) > 0) setStep(3);
                  else toast.error('Enter an amount');
                }}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Step 3: Send */}
        {step === 3 && (
          <>
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <span>Send it</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{isNewCustomer ? newCustomerName : customers.find((c) => c.id === selectedCustomer)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-lg">R {parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>

            {instances.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Send via WhatsApp</label>
                <select
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Don't send via WhatsApp</option>
                  {instances.filter((i) => i.status === 'connected' || i.status === 'open').map((i) => (
                    <option key={i.id} value={i.id}>{i.instanceName}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
              >
                {sending ? (
                  <span className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {instanceId ? 'Send Now' : 'Create Invoice'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
