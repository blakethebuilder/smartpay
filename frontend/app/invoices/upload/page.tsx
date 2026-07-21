'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';

interface ParsedInvoice {
  fileName: string;
  fileSize: number;
  amount?: number;
  currency: string;
  description?: string;
  dueDate?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  rawText?: string;
}

export default function UploadInvoicePage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useRequireAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.pdf') && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a PDF or CSV file');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    // Simulate PDF parsing - in production, this would call a backend endpoint
    setTimeout(() => {
      setParsed({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        amount: undefined,
        currency: 'ZAR',
        description: selectedFile.name.replace(/\.[^/.]+$/, ''),
      });
      setParsing(false);
      toast.success('File uploaded! Please fill in the details below.');
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!parsed) return;
    setUploading(true);

    // In production, this would submit to the backend
    setTimeout(() => {
      toast.success('Invoice uploaded successfully!');
      router.push('/invoices');
    }, 1000);
  };

  return (
    <DashboardLayout title="Upload Invoice" subtitle="Upload a PDF invoice or import from Sage/Xero">
      <div className="max-w-2xl">
        <Link href="/invoices" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to invoices
        </Link>

        {/* Upload Area */}
        {!parsed && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
          >
            {parsing ? (
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-green-600 mx-auto" />
                <p className="mt-4 text-gray-600">Processing invoice...</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Drop your invoice here, or{' '}
                  <label className="text-green-600 hover:underline cursor-pointer">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.csv"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                  </label>
                </p>
                <p className="mt-2 text-sm text-gray-500">PDF or CSV up to 10MB</p>
              </>
            )}
          </div>
        )}

        {/* Parsed Invoice Form */}
        {parsed && (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{parsed.fileName}</p>
                  <p className="text-sm text-gray-500">
                    {(parsed.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setParsed(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={parsed.description || ''}
                  onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Invoice description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                    <input
                      type="number"
                      step="0.01"
                      value={parsed.amount || ''}
                      onChange={(e) => setParsed({ ...parsed, amount: parseFloat(e.target.value) || undefined })}
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={parsed.currency}
                    onChange={(e) => setParsed({ ...parsed, currency: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="ZAR">ZAR</option>
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={parsed.customerName || ''}
                    onChange={(e) => setParsed({ ...parsed, customerName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    value={parsed.customerPhone || ''}
                    onChange={(e) => setParsed({ ...parsed, customerPhone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="+27 82 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={parsed.dueDate || ''}
                  onChange={(e) => setParsed({ ...parsed, dueDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Coming soon:</strong> Automatic PDF parsing and Sage/Xero integration to import invoices directly.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setFile(null);
                  setParsed(null);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!parsed.amount || uploading}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {uploading ? 'Uploading...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        )}

        {/* Accounting Software Integration */}
        <div className="mt-8 bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Import from Accounting Software</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              disabled
              className="p-4 border-2 border-gray-200 rounded-lg text-left opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold text-lg">S</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Sage</p>
                  <p className="text-xs text-gray-500">Coming soon</p>
                </div>
              </div>
            </button>

            <button
              disabled
              className="p-4 border-2 border-gray-200 rounded-lg text-left opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">X</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Xero</p>
                  <p className="text-xs text-gray-500">Coming soon</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
