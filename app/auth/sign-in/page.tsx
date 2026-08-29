import { SignInView } from '@/components/auth/sign-in-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | NeoMCQ',
  description: 'Sign in to your NeoMCQ medical and licensing examination prep workspace.',
};

export default function SignInPage() {
  return <SignInView />;
}
