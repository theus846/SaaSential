import { z } from "zod";
import Stripe from "stripe";
import { env } from "@/env.mjs";
import { eq } from "drizzle-orm";
import { users } from "@/server/db/schema";
import { getOrCreateStripeCustomerIdForUser } from "@/server/payments/stripe";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

const getPriceList = async (stripe: Stripe) => {
  const prices = await stripe.prices.list({
    expand: ["data.product"],
    active: true,
    type: "recurring",
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

export const stripeRouter = createTRPCRouter({
  createCheckoutSession: protectedProcedure.input(z.object({ priceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { priceId } = input;
      const { stripe, session, db, headers } = ctx;

      const req = { headers };
      const host = req.headers.get("host");
      const customerId = await getOrCreateStripeCustomerIdForUser({ db, stripe, userId: session.user?.id });

      if (!customerId) { throw new Error("Could not create customer") }

      const baseUrl = env.NODE_ENV === "development" ? `http://${host ?? "localhost:3000"}` : `https://${host ?? env.NEXT_PUBLIC_BASE_URL}`;

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
        customer: customerId,
        client_reference_id: session.user?.id,
        allow_promotion_codes: true,
        subscription_data: { trial_period_days: 14 }
      });

      if (!checkoutSession) { throw new Error("Could not create checkout session") }
      console.log(checkoutSession);
      return { checkoutUrl: checkoutSession.url };
    }),

  // createBillingPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
  //   const { stripe, session, db } = ctx;
  //   const customerStripeId = await getOrCreateStripeCustomerIdForUser({ db, stripe, userId: session.user?.id });

  //   if (!customerStripeId) {
  //     throw new Error("Could not create customer");
  //   }

  //   let configuration: Stripe.BillingPortal.Configuration;
  //   const configurations = await stripe.billingPortal.configurations.list();

  //   if (configurations.data.length > 0) {
  //     configuration = configurations.data[0]!;
  //   } else {
  //     const product = await stripe.products.retrieve(customerStripeId);

  //     if (!product.active) {
  //       throw new Error("Team's product is not active in Stripe");
  //     }

  //     const prices = await stripe.prices.list({ product: product.id, active: true });
  //     if (prices.data.length === 0) {
  //       throw new Error("No active prices found for the team's product");
  //     }

  //     configuration = await stripe.billingPortal.configurations.create({
  //       business_profile: {
  //         headline: "Manage your subscription",
  //       },
  //       features: {
  //         subscription_update: {
  //           enabled: true,
  //           default_allowed_updates: ['price', 'quantity', 'promotion_code'],
  //           proration_behavior: 'create_prorations',
  //           products: [{ product: product.id, prices: prices.data.map((price) => price.id) }]
  //         },
  //         subscription_cancel: {
  //           enabled: true,
  //           mode: 'at_period_end',
  //           cancellation_reason: { enabled: true, options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'] }
  //         }
  //       },
  //     });
  //   }

  //   return stripe.billingPortal.sessions.create({
  //     customer: customerStripeId,
  //     return_url: `${env.NEXT_PUBLIC_BASE_URL}/dashboard`,
  //     configuration: configuration.id,
  //   });
  // }),

  updateUserSubscription: protectedProcedure.input(
    z.object({
      userId: z.string(),
      subscriptionData: z.object({
        stripeSubscriptionId: z.string().nullable(),
        stripeProductId: z.string().nullable(),
        subscriptionStatus: z.string(),
      })
    })).mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { userId, subscriptionData } = input;

      const user = await db.query.users.findFirst({ where: eq(users.id, input.userId) });

      if (!user) { throw new Error("User not found") }

      await db.update(users).set({ ...subscriptionData, updatedAt: new Date() }).where(eq(users.id, userId));
      return user;
    }),

  getPrices: publicProcedure.query(async ({ ctx }) => {
    const { stripe } = ctx;
    const prices = await stripe.prices.list({
      expand: ["data.product"],
      active: true,
      type: "recurring",
    });

    console.log(prices.data);

    return prices.data.map((price) => ({
      id: price.id,
      productId: typeof price.product === 'string' ? price.product : price.product.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      trialPeriodDays: price.recurring?.trial_period_days
    }));
  }),

  getProducts: publicProcedure.query(async ({ ctx }) => {
    const { stripe } = ctx;
    const products = await stripe.products.list();

    return products.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      defaultPriceId: typeof product.default_price === 'string' ? product.default_price : product.default_price?.id
    }));
  })
});