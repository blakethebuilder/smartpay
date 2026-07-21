'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { whatsappApi } from '@/lib/api';
import { Modal, Spinner, StatusBadge, EmptyState } from '@/components/ui';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Wifi,
  WifiOff,
  QrCode,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  ExternalLink,
} from 'lucide-react';

interface WhatsAppInstance {
  id: string;
  instanceName: string;
  instanceId: string;
  status: string;
  phoneNumber?: string;
  createdAt: string;
}

export default function WhatsAppPage() {
  const router = useRouter();
  const { tenant, token } = useAuthStore();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchInstances();
  }, [token, router]);

  const fetchInstances = async () => {
    try {
      const response = await whatsappApi.listInstances();
      setInstances(response.data);
    } catch (error) {
      console.error('Failed to fetch instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Please enter an instance name');
      return;
    }

    setCreating(true);
    try {
      await whatsappApi.createInstance({ name: newInstanceName.trim().toLowerCase().replace(/\s+/g, '-') });
      toast.success('Instance created! Scan the QR code to connect.');
      setShowCreateModal(false);
      setNewInstanceName('');
      fetchInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create instance');
    } finally {
      setCreating(false);
    }
  };

  const handleShowQR = async (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setLoadingQR(true);
    setQrCode(null);
    try {
      const response = await whatsappApi.getQRCode(instance.id);
      setQrCode(response.data.base64 || response.data.qrcode);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to get QR code');
    } finally {
      setLoadingQR(false);
    }
  };

  const handleRefreshStatus = async (instance: WhatsAppInstance) => {
    try {
      await whatsappApi.getStatus(instance.id);
      fetchInstances();
      toast.success('Status refreshed');
    } catch (error: any) {
      toast.error('Failed to refresh status');
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'open':
      case 'connected':
        return { color: 'text-green-600', bg: 'bg-green-50', icon: Wifi, label: 'Connected' };
      case 'close':
      case 'disconnected':
        return { color: 'text-red-600', bg: 'bg-red-50', icon: WifiOff, label: 'Disconnected' };
      default:
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: RefreshCw, label: 'Connecting' };
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="WhatsApp">
        <Spinner size="lg" className="py-20" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="WhatsApp Integration"
      subtitle="Manage your WhatsApp connections and send messages"
      actions={
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Connect Number
        </button>
      }
    >
      {instances.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="No WhatsApp instances"
          description="Connect your first WhatsApp number to start sending automated messages and payment links to your customers."
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect Number
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {instances.map((instance) => {
            const statusDisplay = getStatusDisplay(instance.status);
            const StatusIcon = statusDisplay.icon;

            return (
              <div
                key={instance.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${statusDisplay.bg}`}>
                        <StatusIcon className={`h-5 w-5 ${statusDisplay.color}`} />
                      </div>
                      <div className="ml-3">
                        <p className="font-semibold text-gray-900">{instance.instanceName}</p>
                        <p className={`text-sm ${statusDisplay.color}`}>{statusDisplay.label}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {instance.phoneNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone</span>
                        <span className="text-gray-900 font-medium">{instance.phoneNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Instance ID</span>
                      <span className="text-gray-900 font-mono text-xs">{instance.instanceId.substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex space-x-2">
                  {(instance.status === 'close' || instance.status === 'disconnected' || instance.status === 'connecting') && (
                    <button
                      onClick={() => handleShowQR(instance)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code
                    </button>
                  )}
                  <button
                    onClick={() => handleRefreshStatus(instance)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Instance Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewInstanceName('');
        }}
        title="Connect WhatsApp Number"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instance Name</label>
            <input
              type="text"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="my-business"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use lowercase letters, numbers, and hyphens. This will be your WhatsApp instance identifier.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              After creating the instance, you'll need to scan a QR code with your WhatsApp app to connect.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setNewInstanceName('');
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateInstance}
              disabled={creating || !newInstanceName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Instance'}
            </button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={!!selectedInstance}
        onClose={() => {
          setSelectedInstance(null);
          setQrCode(null);
        }}
        title={`Scan QR Code - ${selectedInstance?.instanceName || ''}`}
      >
        <div className="text-center">
          {loadingQR ? (
            <div className="py-12">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-500">Generating QR code...</p>
            </div>
          ) : qrCode ? (
            <div>
              <div className="inline-block p-4 bg-white rounded-xl border-2 border-gray-200 mb-4">
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-gray-500">
                Open WhatsApp on your phone, go to Settings &gt; Linked Devices &gt; Link a Device
              </p>
              <button
                onClick={() => handleShowQR(selectedInstance!)}
                className="mt-4 inline-flex items-center px-4 py-2 text-green-600 hover:text-green-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh QR Code
              </button>
            </div>
          ) : (
            <div className="py-12">
              <p className="text-gray-500">Failed to load QR code. Please try again.</p>
              <button
                onClick={() => handleShowQR(selectedInstance!)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
