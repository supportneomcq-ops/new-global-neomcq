/**
 * Automatic administrator provisioning is intentionally disabled.
 *
 * Admin access must be granted through a trusted, explicit role-management workflow.
 * Never create an administrator, reset a password, or assign a role during login.
 */
export async function bootstrapAdmin() {
  console.warn('[SECURITY] Automatic administrator bootstrap is disabled.');
  return {
    success: false,
    message: 'Automatic administrator provisioning is disabled. Assign admin roles explicitly.',
  };
}
