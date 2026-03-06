-- Add Stripe integration columns to promoted_placements
-- stripe_subscription_id: used to deactivate on subscription cancellation
-- stripe_customer_id: for lookup and future invoice management
ALTER TABLE promoted_placements
  ADD COLUMN stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN stripe_customer_id TEXT;
