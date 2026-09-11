'use client';

import { useState, useCallback, useEffect } from 'react';
import { PlanCode } from '@/lib/plans/plan-config';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function usePlanCheckout() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePlanCode, setActivePlanCode] = useState<PlanCode | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Dynamically load Razorpay SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const checkoutPlan = useCallback(
    async (
      planCode: PlanCode,
      options?: {
        preferredCurrency?: 'USD' | 'INR';
        onSuccess?: (data: any) => void;
        onError?: (error: string) => void;
      }
    ) => {
      setIsProcessing(true);
      setActivePlanCode(planCode);
      setErrorMessage('');
      setSuccessMessage('');
      setStatusMessage(`Initializing secure order for ${planCode} Plan...`);

      try {
        // 1. Create order on secure backend
        const res = await fetch('/api/subscriptions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planCode,
            preferredCurrency: options?.preferredCurrency || 'USD',
          }),
        });

        const orderData = await res.json();
        if (!res.ok || !orderData.success) {
          if (res.status === 401) {
            router.push('/auth/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
            throw new Error('Please sign in to subscribe.');
          }
          throw new Error(orderData.error || 'Failed to create subscription order.');
        }

        setStatusMessage('Opening secure checkout...');

        // 2. Razorpay Live / Test Checkout
        if (
          typeof window !== 'undefined' &&
          window.Razorpay &&
          orderData.keyId &&
          !orderData.keyId.startsWith('mock_') &&
          !orderData.keyId.includes('placeholder')
        ) {
          const rzpOptions = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'NeoMCQ Learning Platform',
            description: `${orderData.planName} Plan (${orderData.billingInterval})`,
            order_id: orderData.subscriptionId ? undefined : orderData.orderId,
            subscription_id: orderData.subscriptionId || undefined,
            prefill: {
              name: orderData.prefill?.name || '',
              email: orderData.prefill?.email || '',
            },
            theme: {
              color: planCode === 'ELITE' ? '#F59E0B' : '#6D5BFF',
            },
            handler: async (response: any) => {
              setStatusMessage('Verifying payment on secure server...');
              try {
                const verifyRes = await fetch('/api/subscriptions/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    planCode,
                    currency: orderData.currency,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                    razorpay_subscription_id: response.razorpay_subscription_id || orderData.subscriptionId,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });

                const verifyData = await verifyRes.json();
                if (!verifyRes.ok || !verifyData.success) {
                  throw new Error(verifyData.error || 'Payment verification failed.');
                }

                setSuccessMessage(`${orderData.planName} plan activated successfully!`);
                setIsProcessing(false);
                setStatusMessage('');

                if (options?.onSuccess) {
                  options.onSuccess(verifyData);
                } else {
                  router.push('/billing?upgraded=true');
                }
              } catch (verifyErr: any) {
                const msg = verifyErr.message || 'Payment verification failed.';
                setErrorMessage(msg);
                setIsProcessing(false);
                setStatusMessage('');
                if (options?.onError) options.onError(msg);
              }
            },
            modal: {
              ondismiss: () => {
                setIsProcessing(false);
                setStatusMessage('');
                setActivePlanCode(null);
              },
            },
          };

          const rzp = new window.Razorpay(rzpOptions);
          rzp.on('payment.failed', (resp: any) => {
            const msg = resp.error?.description || 'Payment was unsuccessful. Your plan was not changed.';
            setErrorMessage(msg);
            setIsProcessing(false);
            setStatusMessage('');
            if (options?.onError) options.onError(msg);
          });
          rzp.open();
        } else {
          // Dev / Preview Sandboxed Simulation
          setStatusMessage('Processing verified test checkout on server...');
          setTimeout(async () => {
            try {
              const verifyRes = await fetch('/api/subscriptions/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  planCode,
                  currency: orderData.currency,
                  razorpay_payment_id: `pay_test_${Date.now()}`,
                  razorpay_order_id: orderData.orderId,
                  razorpay_subscription_id: orderData.subscriptionId || undefined,
                  razorpay_signature: `sig_test_${Date.now()}`,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Test payment verification failed.');
              }

              setSuccessMessage(`${orderData.planName} plan activated successfully!`);
              setIsProcessing(false);
              setStatusMessage('');

              if (options?.onSuccess) {
                options.onSuccess(verifyData);
              } else {
                router.push('/billing?upgraded=true');
              }
            } catch (err: any) {
              const msg = err.message || 'Failed test verification';
              setErrorMessage(msg);
              setIsProcessing(false);
              setStatusMessage('');
              if (options?.onError) options.onError(msg);
            }
          }, 1200);
        }
      } catch (err: any) {
        console.error('Checkout error:', err);
        const msg = err.message || 'Payment initiation failed';
        setErrorMessage(msg);
        setIsProcessing(false);
        setStatusMessage('');
        if (options?.onError) options.onError(msg);
      }
    },
    [router]
  );

  return {
    checkoutPlan,
    isProcessing,
    activePlanCode,
    statusMessage,
    errorMessage,
    successMessage,
    clearMessages: () => {
      setErrorMessage('');
      setSuccessMessage('');
      setStatusMessage('');
    },
  };
}
