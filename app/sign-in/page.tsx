import { redirect } from 'next/navigation';

/** Backward-compatible alias for older sign-in links. */
export default function SignInAliasPage() {
  redirect('/login');
}
