'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge, Spinner } from '@/components/ui';
import DashboardLayout from '@/components/DashboardLayout';
import { MessageSquare, Send, ArrowUpRight, ArrowDownLeft, Search, Link2 } from 'lucide-react';

interface Message {
  id: string;
  instanceId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  type: string;
  content: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useRequireAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    fetchMessages();
  }, [isReady, isAuthenticated, page]);

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/whatsapp/messages?page=${page}&limit=50`);
      setMessages(Array.isArray(response.data) ? response.data : response.data.messages || []);
      setTotalPages(1);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.content?.toLowerCase().includes(search.toLowerCase()) ||
      m.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      m.customerPhone?.includes(search)
  );

  const truncateContent = (content: string, maxLen: number = 60) => {
    if (!content) return '';
    const clean = content.replace(/\*/g, '').replace(/\n/g, ' ');
    return clean.length > maxLen ? clean.substring(0, maxLen) + '...' : clean;
  };

  if (loading) {
    return (
      <DashboardLayout title="Messages">
        <Spinner size="lg" className="py-20" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Message History"
      subtitle="All WhatsApp messages sent through SmartPay"
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Messages list */}
      {filteredMessages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-500">
            Messages will appear here when you send payment links via WhatsApp.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-green-50 rounded-lg mt-0.5">
                      <Send className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 text-sm">
                          {msg.customerName || msg.customerPhone || 'Unknown'}
                        </p>
                        <StatusBadge status={msg.status} />
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {truncateContent(msg.content)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-gray-500">{formatDateTime(msg.sentAt || msg.createdAt)}</p>
                    {msg.content?.includes('pay') && (
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        <Link2 className="h-3 w-3 mr-1" />
                        Has link
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
