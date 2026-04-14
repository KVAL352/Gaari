import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import { TIER_SLOT } from '$lib/promotion-config';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const stripeKey = env.STRIPE_SECRET_KEY;
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

	if (!stripeKey || !webhookSecret) {
		console.error('Stripe env vars not configured');
		throw error(500, 'Stripe not configured');
	}

	const stripe = new Stripe(stripeKey);

	// Stripe requires the raw body bytes for signature verification
	const rawBody = await request.text();
	const sig = request.headers.get('stripe-signature');

	if (!sig) {
		throw error(400, 'Missing stripe-signature header');
	}

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('Stripe signature verification failed:', message);
		throw error(400, `Webhook signature invalid: ${message}`);
	}

	switch (event.type) {
		case 'checkout.session.completed':
			await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
			break;
		case 'customer.subscription.deleted':
			await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
			break;
		default:
			// Ignore unhandled event types
			break;
	}

	return json({ received: true });
};

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
	const meta = session.metadata ?? {};
	const venueName = meta.venue_name;
	const tier = meta.tier as 'basis' | 'standard' | 'partner' | undefined;
	const collectionSlugsRaw = meta.collection_slugs;

	if (!venueName || !tier || !collectionSlugsRaw) {
		console.error(
			'Stripe webhook: missing required metadata on checkout session',
			session.id,
			meta
		);
		return;
	}

	const slotShare = TIER_SLOT[tier];
	if (!slotShare) {
		console.error('Stripe webhook: unknown tier', tier);
		return;
	}

	const collectionSlugs = collectionSlugsRaw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	if (collectionSlugs.length === 0) {
		console.error('Stripe webhook: no valid collection_slugs in metadata');
		return;
	}

	const contactEmail = meta.contact_email || (session.customer_details?.email ?? null);
	const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);
	const subscriptionId =
		typeof session.subscription === 'string' ? session.subscription : null;
	const customerId = typeof session.customer === 'string' ? session.customer : null;

	const { error: dbError } = await supabaseAdmin.from('promoted_placements').insert({
		venue_name: venueName,
		tier,
		slot_share: slotShare,
		collection_slugs: collectionSlugs,
		active: true,
		start_date: today,
		end_date: null,
		contact_email: contactEmail,
		notes: `Stripe checkout ${session.id}`,
		stripe_subscription_id: subscriptionId,
		stripe_customer_id: customerId,
	});

	if (dbError) {
		console.error('Stripe webhook: failed to insert promoted_placement', dbError);
		// Don't throw — Stripe will retry if we return 500, which could cause duplicates
		// Log and continue; admin can fix manually via /admin/promotions
		return;
	}

	console.log(
		`Stripe webhook: activated placement for "${venueName}" (${tier}) on ${collectionSlugs.join(', ')}`
	);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
	const { error: dbError } = await supabaseAdmin
		.from('promoted_placements')
		.update({ active: false })
		.eq('stripe_subscription_id', subscription.id);

	if (dbError) {
		console.error('Stripe webhook: failed to deactivate placement', dbError);
		return;
	}

	console.log(`Stripe webhook: deactivated placement for subscription ${subscription.id}`);
}
