import { Metadata } from 'next';

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
    <div className="min-h-screen bg-slate-100 dark:bg-[#050816] text-slate-900 dark:text-white font-sans antialiased">
      {children}
    </div>
  );
}
