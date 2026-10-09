import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SelectionProvider } from '@/lib/context/selection-context';
import { TopicContentProvider } from '@/lib/context/topic-content-context';
import { GlobalLoadingProvider } from '@/components/global-loading-provider';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';
import { PWAInstallPrompt } from '@/components/pwa/install-prompt';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/seo/structured-data';
import { getSiteUrl } from '@/lib/seo/config';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: false,
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#090D1E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://neomcq.com'),
  title: 'NeoMCQ — World’s Most Intelligent AI Exam Preparation Platform',
  description: 'AI-powered global exam preparation and learning platform. One AI. Every Exam. Every Country.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'NeoMCQ — World’s Most Intelligent AI Exam Preparation Platform',
    description: 'AI-powered global exam preparation and learning platform.',
    url: 'https://neomcq.com',
    siteName: 'NeoMCQ',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NeoMCQ Global Exam Preparation',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeoMCQ — Global Exam Preparation',
    description: 'AI-powered global exam preparation and learning platform.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NeoMCQ',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgSchema = generateOrganizationSchema();
  const webSiteSchema = generateWebSiteSchema();

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>

        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Gloria+Hallelujah&family=Kalam:wght@300;400;700&family=Patrick+Hand&display=swap" rel="stylesheet" />
        {/* Schema.org Organization Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        {/* Schema.org WebSite Structured Data with Sitelinks Searchbox */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
      </head>
      <body
        className="min-h-screen bg-background text-foreground antialiased selection:bg-[#6D5BFF] selection:text-white"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalLoadingProvider>
            <SelectionProvider>
              <TopicContentProvider>
                {children}
                <ServiceWorkerRegister />
                <PWAInstallPrompt />
              </TopicContentProvider>
            </SelectionProvider>
          </GlobalLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

