import { relations, sql } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";
import { index, text, timestamp, varchar, pgTable, integer } from "drizzle-orm/pg-core";

import { stripeSubscriptionEnum } from "./stripe";

export const users = pgTable('users', {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: stripeSubscriptionEnum("stripe_subscription_status"),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Clients Table (Each agency can have multiple clients)
export const clients = pgTable("clients", {
  id: text("id").default(sql`gen_random_uuid()`).primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }), // Changed from uuid to text
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }), // Changed from uuid to text
  type: text("type").$type<AdapterAccount["type"]>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({ userIdIdx: index("accountuserId_idx").on(account.userId) }));

// Users → One-to-Many → Clients
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  clients: many(clients),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

// Clients → One-to-Many → Reports
export const clientsRelations = relations(clients, ({ one }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
}));

export const sessions = pgTable("session", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }), // Changed from uuid to text
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
}, (session) => ({ userIdIdx: index("sessionuserId_idx").on(session.userId) }));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({ pk: primaryKey({ columns: [vt.identifier, vt.token] }) }));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
