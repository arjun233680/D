import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'Adhyapak — CTET, HTET, UPTET, REET, DSSSB, KVS & NVS Preparation',
    template: '%s · Adhyapak',
  },
  description:
    'India\'s dedicated preparation app for teaching exams. Live batches, notes, video lessons, MCQ practice and full-length mock tests for CTET, HTET, UPTET, Bihar TET, DSSSB, KVS, NVS, REET, HSSC TGT/PGT/PRT and every state TET — in Hindi and English.',
  keywords: [
    'CTET', 'HTET', 'UPTET', 'Bihar TET', 'DSSSB', 'KVS', 'NVS', 'REET',
    'HSSC TGT', 'PGT', 'PRT', 'Super TET', 'teaching exam preparation', 'शिक्षक भर्ती परीक्षा',
  ],
  applicationName: 'Adhyapak',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Adhyapak', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#0F9D58',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
