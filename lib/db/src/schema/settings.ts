import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settingsTable).omit({
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settingsTable.$inferSelect;
