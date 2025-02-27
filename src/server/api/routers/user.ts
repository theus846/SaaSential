import { eq } from "drizzle-orm";
import { object, string, z } from "zod";
import { users } from "@/server/db/schema";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const signInSchema = object({
  email: string({ required_error: "Email is required" }).min(1, "Email is required").email("Invalid email"),
  password: string({ required_error: "Password is required" }).min(1, "Password is required").min(8, "Password must be more than 8 characters").max(32, "Password must be less than 32 characters"),
});

export const usersRouter = createTRPCRouter({
  find: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const user = await ctx.db.query.users.findFirst({ where: eq(users.id, input.id) }) ?? null;

    return user;
  })
});

