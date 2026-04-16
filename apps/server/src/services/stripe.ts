// Stripe stub — logs events instead of calling Stripe API
// Replace with real Stripe SDK integration when ready

export function createCheckoutSession(params: {
  priceId: string;
  userId: string;
  gymId: string;
}) {
  console.log('[Stripe Stub] Would create checkout session:', params);
  return { id: 'stub_session_id', url: null };
}

export function createCustomer(email: string) {
  console.log('[Stripe Stub] Would create customer:', email);
  return { id: 'stub_customer_id' };
}

export function cancelSubscription(subscriptionId: string) {
  console.log('[Stripe Stub] Would cancel subscription:', subscriptionId);
  return { id: subscriptionId, status: 'canceled' };
}

export function handleWebhookEvent(event: { type: string; data: any }) {
  console.log(`[Stripe Stub] Received webhook event: ${event.type}`, event.data);

  switch (event.type) {
    case 'checkout.session.completed':
      console.log('[Stripe Stub] Checkout completed — would activate subscription');
      break;
    case 'invoice.payment_succeeded':
      console.log('[Stripe Stub] Payment succeeded — would extend subscription period');
      break;
    case 'invoice.payment_failed':
      console.log('[Stripe Stub] Payment failed — would notify user');
      break;
    case 'customer.subscription.deleted':
      console.log('[Stripe Stub] Subscription cancelled — would deactivate');
      break;
    default:
      console.log(`[Stripe Stub] Unhandled event type: ${event.type}`);
  }
}
