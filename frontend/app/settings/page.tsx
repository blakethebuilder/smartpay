'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { tenantApi, invoiceApi } from '@/lib/api';
import { Modal, Spinner } from '@/components/ui';
import DashboardLayout from '@/components/DashboardLayout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Shield, Key, CheckCircle, AlertCircle, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

interface Merchant {
  id: string;
  gateway: string;
  isActive: boolean;
  createdAt: string;
}

const credentialSchema = z.object({
  publicKey: z.string().min(1, 'Public key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
  webhookSecret: z.string().optional(),
});

type CredentialFormData = z.infer<typeof credentialSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { tenant, token } = useAuthStore();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CredentialFormData>({
    resolver: zodResolver(credentialSchema),
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [token, router]);

  const fetchData = async () => {
    try {
      const [merchantsRes, gatewaysRes] = await Promise.all([
        tenantApi.getMerchants(),
        invoiceApi.getGateways(),
      ]);
      setMerchants(merchantsRes.data);
      setGateways(gatewaysRes.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CredentialFormData) => {
    if (!selectedGateway) return;
    setSubmitting(true);
    try {
      await tenantApi.addMerchant({
        gateway: selectedGateway,
        publicKey: data.publicKey,
        secretKey: data.secretKey,
        webhookSecret: data.webhookSecret,
      });
      toast.success(`${selectedGateway.charAt(0).toUpperCase() + selectedGateway.slice(1)} credentials saved`);
      setShowModal(false);
      reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMerchant = async (id: string) => {
    if (!confirm('Are you sure you want to remove these credentials?')) return;
    try {
      await tenantApi.deleteMerchant(id);
      toast.success('Credentials removed');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove credentials');
    }
  };

  const getMerchantForGateway = (gatewayId: string) => {
    return merchants.find((m) => m.gateway === gatewayId);
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <DashboardLayout title="Settings">
        <Spinner size="lg" className="py-20" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" subtitle="Manage your payment gateway credentials">
      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Business Profile</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Business Name</label>
              <p className="mt-1 text-gray-900">{tenant?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-gray-900">{tenant?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1 text-gray-900">{tenant?.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Gateways */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-semibold text-gray-900">Payment Gateways</h3>
          </div>
          <p className="text-sm text-gray-500">Configure your payment processing</p>
        </div>
        <div className="divide-y divide-gray-100">
          {gateways.map((gateway) => {
            const merchant = getMerchantForGateway(gateway.id);
            const isConfigured = !!merchant;
            const isLive = gateway.status === 'live';

            return (
              <div key={gateway.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${isConfigured ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <Key className={`h-5 w-5 ${isConfigured ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="font-medium text-gray-900">{gateway.name}</p>
                      {isLive ? (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          Live
                        </span>
                      ) : (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{gateway.description}</p>
                    {isConfigured && (
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  {isLive && (
                    <button
                      onClick={() => {
                        setSelectedGateway(gateway.id);
                        setShowModal(true);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isConfigured
                          ? 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isConfigured ? 'Update' : 'Configure'}
                    </button>
                  )}
                  {!isLive && (
                    <span className="text-sm text-gray-400">Not available yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Credentials Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          reset();
        }}
        title={`${selectedGateway.charAt(0).toUpperCase() + selectedGateway.slice(1)} Credentials`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Your credentials are encrypted and stored securely. They are only used to process payments on your behalf.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
            <input
              {...register('publicKey')}
              type="password"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="pk_test_..."
            />
            {errors.publicKey && (
              <p className="mt-1 text-sm text-red-600">{errors.publicKey.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
            <input
              {...register('secretKey')}
              type="password"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="sk_test_..."
            />
            {errors.secretKey && (
              <p className="mt-1 text-sm text-red-600">{errors.secretKey.message}</p>
            )}
          </div>

          {selectedGateway === 'paystack' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret <span className="text-gray-400">(optional)</span>
              </label>
              <input
                {...register('webhookSecret')}
                type="password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="whsec_..."
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                reset();
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Credentials'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
