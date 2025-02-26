import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials"

import { db } from "@/server/db";
import { signInSchema } from "../api/routers/user";
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

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // const { email, password } = await signInSchema.parseAsync(credentials);
        const { email, password } = credentials;
        let user: User | null = null;
        try {
          user = await db.query.users.findFirst({ where: eq(users.email, email + '') }) ?? null;

          if (!user) {
            throw new Error("Invalid credentials");
          }

        } catch (e) {
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
} satisfies NextAuthConfig;
