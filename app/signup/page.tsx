import { redirect } from 'next/navigation';

// Keep one canonical signup flow so exam setup, study preferences, curriculum
// preparation, and email verification happen in the required order.
export default function SignUpPage() {
  redirect('/onboarding');
}
