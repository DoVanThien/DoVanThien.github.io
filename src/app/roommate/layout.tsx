import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Roommate Hub — Việc nhà & chi tiêu chung',
  description: 'Chia việc nhà xoay vòng, ghi chi tiêu và tự cấn trừ công nợ cho phòng trọ, nhà chung.',
  manifest: '/roommate-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Roommate Hub',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF6F0' },
    { media: '(prefers-color-scheme: dark)', color: '#18171A' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RoommateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
