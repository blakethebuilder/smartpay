import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthInitializer from '@/components/AuthInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SmartPay - Automated Billing & WhatsApp',
  description: 'Multi-tenant SaaS platform for automated billing and customer communications via WhatsApp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthInitializer>
          {children}
        </AuthInitializer>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
