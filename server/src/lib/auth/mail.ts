/**
 * Invite / set-password mailer.
 * Replace with a real provider (Resend, SES, Supabase, etc.) in production.
 */
export async function sendInviteEmail(input: {
  to: string;
  inviteToken: string;
  companyName: string;
}): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3003";
  const acceptUrl = `${appUrl}/invites/${input.inviteToken}/accept`;

  console.info("[mail] invite email", {
    to: input.to,
    companyName: input.companyName,
    acceptUrl,
  });
}
