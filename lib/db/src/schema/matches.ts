import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const matchesTable = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: text("game_id").notNull(),
  title: text("title"),
  status: text("status").notNull().default("draft"),
  config: jsonb("config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  backgroundPath: text("background_path"),
  result: jsonb("result").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  endedAt: true,
});

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
