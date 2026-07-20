import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const assistantMessages = sqliteTable("assistant_messages", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("assistant_messages_user_time_idx").on(table.userEmail, table.createdAt)]);
