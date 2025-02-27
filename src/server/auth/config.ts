import { eq } from "drizzle-orm";
import { object, string } from "zod";
import bcrypt, { compare } from "bcryptjs";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";

import { db } from "@/server/db";
import { accounts, sessions, User, users, verificationTokens } from "@/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: User;
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

const signInSchema = object({
  email: string({ required_error: "Email is required" }).min(1, "Email is required").email("Invalid email"),
  password: string({ required_error: "Password is required" }).min(1, "Password is required").min(8, "Password must be more than 8 characters").max(32, "Password must be less than 32 characters"),
});

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    // Credentials provider for email/password sign in
    // This in not encouraged by NextAuth.js, due to underlying security concerns.
    // Be sure to implement proper security measures like rate limiting, brute-force 
    // protections, password hashing, email verification, etc.

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = signInSchema.parse(credentials);
        let user: User | null = null;
        try {
          user = await db.query.users.findFirst({ where: eq(users.email, email + '') }) ?? null;

          if (!user) {
            throw new Error("Invalid credentials");
          }

          if (!(await compare(password, user.passwordHash))) {
            throw new Error("Invalid password");
          }

          if (!await compare(password, user.passwordHash)) { throw new Error("Invalid password") }
        } catch (e) {
          console.error(e);
          throw new Error("Invalid credentials");
        }
        return user;
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      async profile(profile: GoogleProfile) {
        const randomPassword = crypto.randomUUID(); // Generate a random password
        const hashedPassword = await bcrypt.hash(randomPassword, 10); // Hash the password

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          passwordHash: hashedPassword,
          stripeSubscriptionStatus: 'incomplete',
          emailVerified: profile.email_verified ? new Date() : undefined,
        };
      },
    }),
    DiscordProvider,
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens
  }),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  pages: {
    signIn: "/login",
  }
} satisfies NextAuthConfig;
