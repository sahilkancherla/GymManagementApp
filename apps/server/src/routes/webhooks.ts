import { Router } from 'express';
import { handleWebhookEvent } from '../services/stripe';

export const webhookRoutes = Router();

// Stripe webhook endpoint (stub)
webhookRoutes.post('/webhooks/stripe', async (req, res) => {
  try {
    const event = req.body;
    handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error processing event:', err);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});
