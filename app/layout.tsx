import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SelectionProvider } from '@/lib/context/selection-context';

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

export const metadata: Metadata = {
  title: 'NeoMCQ — World’s Most Intelligent AI Exam Preparation Platform',
  description: 'One AI. Every Exam. Every Country. Prepare Smarter. Not Harder.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (typeof window !== 'undefined') {
                  const originalFetch = window.fetch;
                  const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || 
                               Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
                  if (desc && !desc.writable && desc.configurable) {
                    Object.defineProperty(window, 'fetch', {
                      value: originalFetch,
                      writable: true,
                      configurable: true,
                      enumerable: true
                    });
                  }
                }
              } catch (e) {}
            `,
          }}
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
          <SelectionProvider>
            {children}
          </SelectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
