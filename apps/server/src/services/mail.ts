// Mailchimp / email stub — logs instead of sending
// Replace with real Mailchimp/SendGrid/Resend integration when ready

export function sendWelcomeEmail(params: { email: string; firstName: string; gymName: string }) {
  console.log(`[Mail Stub] Would send welcome email to ${params.email} for gym "${params.gymName}"`);
}

export function sendClassReminder(params: { email: string; className: string; date: string; time: string }) {
  console.log(`[Mail Stub] Would send class reminder to ${params.email}: ${params.className} on ${params.date} at ${params.time}`);
}

export function addToMailingList(params: { email: string; firstName: string; lastName: string; listTag?: string }) {
  console.log(`[Mail Stub] Would add ${params.email} to mailing list${params.listTag ? ` (tag: ${params.listTag})` : ''}`);
}
