'use client';

import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import QuickSend from './QuickSend';
import { Zap } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const [showQuickSend, setShowQuickSend] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="p-6 lg:p-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
              </div>
              {actions && <div className="mt-4 sm:mt-0">{actions}</div>}
            </div>
          </div>
          {children}
        </main>
      </div>

      {/* Floating Quick Send Button */}
      <button
        onClick={() => setShowQuickSend(true)}
        className="fixed bottom-6 right-6 z-40 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex items-center"
        title="Quick Send Payment Link"
      >
        <Zap className="h-6 w-6" />
        <span className="ml-2 font-medium hidden sm:inline">Quick Send</span>
      </button>

      {/* Quick Send Modal */}
      <QuickSend isOpen={showQuickSend} onClose={() => setShowQuickSend(false)} />
    </div>
  );
}
