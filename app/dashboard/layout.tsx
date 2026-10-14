import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — NeoMCQ',
  description: 'Personalized exam preparation and learning analytics portal.',
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060914] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      {children}
    </div>
  );
}
