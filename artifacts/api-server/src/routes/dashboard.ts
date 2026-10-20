import { Router, type IRouter } from "express";
import { count, eq } from "drizzle-orm";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { db, matchesTable } from "@workspace/db";
import { getAdminSessionUsername } from "../lib/admin-session";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");

  try {
    const [total, active, finished] = await Promise.all([
      db.select({ value: count() }).from(matchesTable),
      db
        .select({ value: count() })
        .from(matchesTable)
        .where(eq(matchesTable.status, "live")),
      db
        .select({ value: count() })
        .from(matchesTable)
        .where(eq(matchesTable.status, "finished")),
    ]);

    res.json({
      totalMatches: total[0]?.value ?? 0,
      activeMatches: active[0]?.value ?? 0,
      finishedMatches: finished[0]?.value ?? 0,
    });
  } catch {
    res.json({
      totalMatches: 0,
      activeMatches: 0,
      finishedMatches: 0,
    });
  }
});

export default router;
