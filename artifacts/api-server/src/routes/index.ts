import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import matchesRouter from "./matches";
import simulatorRouter from "./simulator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(matchesRouter);
router.use(simulatorRouter);

export default router;
