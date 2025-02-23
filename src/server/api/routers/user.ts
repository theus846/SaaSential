import { object, string, z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { eq } from "drizzle-orm";
import { users } from "@/server/db/schema";
import { compare, hash } from "bcryptjs";

export const signInSchema = object({
  email: string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email"),
  password: string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be more than 8 characters")
    .max(32, "Password must be less than 32 characters"),
});

const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
) {
  return compare(plainTextPassword, hashedPassword);
}

export const usersRouter = createTRPCRouter({
  login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string() }),
  ).mutation(async ({ ctx, input }) => {
    // login logic here
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user) { throw new Error("User not found") }

    if (!(await comparePasswords(input.password, user.passwordHash))) {
      throw new Error("Invalid password");
    }

    return user;
  }),
  
});

