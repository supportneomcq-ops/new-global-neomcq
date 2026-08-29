'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Disable in iframe preview or development sandbox to prevent proxy and fetch interception issues
    const isIframe = window.self !== window.top;
    const isDevHost =
      window.location.hostname.includes('localhost') ||
      window.location.hostname.includes('run.app') ||
      process.env.NODE_ENV !== 'production';

    if (isIframe || isDevHost) {
      // Unregister any active service workers in development / iframe preview
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      }).catch(() => {});
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SW] New version available.');
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('[SW] Registration skipped:', error?.message);
        });
    });
  }, []);

  return null;
}
