import Stripe from "stripe";
import { env } from "@/env.js";

export const stripe = new Stripe(env.STRIPE_SK, {
  apiVersion: "2025-01-27.acacia",
});