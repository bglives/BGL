import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { matchesTable } from "./matches";

export const matchEventsTable = pgTable("match_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matchesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMatchEventSchema = createInsertSchema(matchEventsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMatchEvent = z.infer<typeof insertMatchEventSchema>;
export type MatchEvent = typeof matchEventsTable.$inferSelect;
