import { createInsertSchema } from "drizzle-zod";
import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  path: text("path").notNull(),
  size: bigint("size_bytes", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
