import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var desc = Object.getOwnPropertyDescriptor(window, 'fetch');
                  if (desc && desc.get && !desc.set) {
                    var _fetch = window.fetch;
                    Object.defineProperty(window, 'fetch', {
                      get: function() { return _fetch; },
                      set: function(fn) { _fetch = fn; },
                      configurable: true,
                      enumerable: true
                    });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white antialiased selection:bg-[#6D5BFF] selection:text-white" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
