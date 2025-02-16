import { env } from "@/env.js";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getOrCreateStripeCustomerIdForUser } from "@/server/stripe/stripe-webhook-handlers";

export const stripeRouter = createTRPCRouter({
  createCheckoutSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { stripe, session, db, headers } = ctx;
    const req = { headers };
    const host = req.headers.get("host");
    const customerId = await getOrCreateStripeCustomerIdForUser({
      db,
      stripe,
      userId: session.user?.id,
    });

    if (!customerId) {
      throw new Error("Could not create customer");
    }

    const baseUrl =
      env.NODE_ENV === "development"
        ? `http://${host ?? "localhost:3000"}`
        : `https://${host ?? env.NEXT_PUBLIC_VERCEL_URL}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: session.user?.id,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/u/@${session.user.id}?success=true`,
      cancel_url: `${baseUrl}/u/@${session.user.id}?success=false`,
      subscription_data: {
        metadata: {
          userId: session.user?.id,
        },
      },
    });

    if (!checkoutSession) {
      throw new Error("Could not create checkout session");
    }

    return { checkoutUrl: checkoutSession.url };
  }),

  createBillingPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { stripe, session, db, headers } = ctx;
    const req = { headers };
    const host = req.headers.get("host");

    const customerId = await getOrCreateStripeCustomerIdForUser({
      db,
      stripe,
      userId: session.user?.id,
    });

    if (!customerId) {
      throw new Error("Could not create customer");
    }

    const baseUrl =
      env.NODE_ENV === "development"
        ? `http://${host ?? "localhost:3000"}`
        : `https://${host ?? env.NEXT_PUBLIC_VERCEL_URL}`;

    const stripeBillingPortalSession =
      await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/dashboard`,
      });

    if (!stripeBillingPortalSession) {
      throw new Error("Could not create billing portal session");
    }

    return { billingPortalUrl: stripeBillingPortalSession.url };
  }),
});