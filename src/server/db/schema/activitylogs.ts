import { relations, sql } from "drizzle-orm";
import { serial, text, timestamp, varchar, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const activityLogs = pgTable('activity_logs', {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Changed from uuid to text
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

export type ActivityLog = typeof activityLogs.$inferSelect;

// export const users = pgTable('users', {
//   id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
//   name: varchar('name', { length: 100 }),
//   email: varchar('email', { length: 255 }).notNull().unique(),
//   emailVerified: timestamp("emailVerified", { mode: "date" }),
//   image: text("image"),
//   passwordHash: text('password_hash').notNull(),
//   role: varchar('role', { length: 20 }).notNull().default('member'),
//   stripeCustomerId: text("stripe_customer_id"),
//   stripeSubscriptionId: text("stripe_subscription_id"),
//   stripeSubscriptionStatus: stripeSubscriptionEnum("stripe_subscription_status"),
//   createdAt: timestamp('created_at').notNull().defaultNow(),
//   updatedAt: timestamp('updated_at').notNull().defaultNow(),
//   deletedAt: timestamp('deleted_at'),
// });