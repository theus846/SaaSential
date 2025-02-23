import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { users } from "@/server/db/schema";
import type * as schemaFile from "@/server/db/schema";
import { stripe } from "./client";

// retrieves a Stripe customer id for a given user if it exists or creates a new one
export const getOrCreateStripeCustomerIdForUser = async ({ stripe, db, userId }: { stripe: Stripe; db: PostgresJsDatabase<typeof schemaFile>; userId: string; }) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (!user) throw new Error("User not found");

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // create a new customer
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    // use metadata to link this Stripe customer to internal user id
    metadata: { userId },
  });

  const updatedUser = await db.update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId))
    .returning({ stripeCustomerId: users.stripeCustomerId })
    .then((res) => res[0]);

  if (updatedUser?.stripeCustomerId) {
    return updatedUser.stripeCustomerId;
  } else {
    return undefined;
  }
};

export const handleInvoicePaid = async ({ event, stripe, db }: { event: Stripe.Event; stripe: Stripe; db: PostgresJsDatabase<typeof schemaFile>; }) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await db.update(users).set({ stripeSubscriptionId: subscription.id, stripeSubscriptionStatus: subscription.status }).where(eq(users.id, userId));
};

export const handleSubscriptionCreatedOrUpdated = async ({ event, db }: { event: Stripe.Event; db: PostgresJsDatabase<typeof schemaFile> }) => {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata.userId;
  if (!userId) return;

  // update user with subscription data
  await db.update(users).set({ stripeSubscriptionId: subscription.id, stripeSubscriptionStatus: subscription.status }).where(eq(users.id, userId));
};

export const handleSubscriptionCanceled = async ({ event, db }: { event: Stripe.Event; db: PostgresJsDatabase<typeof schemaFile> }) => {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await db.update(users).set({ stripeSubscriptionId: null, stripeSubscriptionStatus: null }).where(eq(users.id, userId));
};

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId: typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId: typeof product.default_price === 'string' ? product.default_price : product.default_price?.id
  }));
}
