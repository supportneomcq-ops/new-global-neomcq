import type { Metadata } from 'next';
import { SignUpView } from '@/components/auth/sign-up-view';

export const metadata: Metadata = {
  title: 'Create Account | NeoMCQ',
  description: 'Create your NeoMCQ account to build your personalized exam preparation workspace.',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <SignUpView />;
}
