import { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'NeoMCQ Admin Operations Center',
  description: 'Restricted system administration portal.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="neo-admin-root min-h-screen bg-slate-100 text-slate-900 antialiased dark:bg-[#050816] dark:text-white">
      <div className="fixed bottom-4 right-4 z-[100] rounded-full border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
