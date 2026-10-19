import { Router, type IRouter } from "express";
import { count, eq } from "drizzle-orm";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { db, matchesTable } from "@workspace/db";
import { getAdminSessionUsername } from "../lib/admin-session";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");

  if (!getAdminSessionUsername(req)) {
    res.status(401).json({ error: "É necessário entrar para acessar o painel." });
    return;
  }

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

    res.json(
      GetDashboardSummaryResponse.parse({
        totalMatches: total[0]?.value ?? 0,
        activeMatches: active[0]?.value ?? 0,
        finishedMatches: finished[0]?.value ?? 0,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to load dashboard summary");
    res.status(500).json({ error: "Não foi possível carregar o painel." });
  }
});

export default router;
