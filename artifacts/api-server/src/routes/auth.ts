import { Router, type IRouter } from "express";
import {
  GetAuthSessionResponse,
  LoginAdminBody,
  LoginAdminResponse,
  LogoutAdminResponse,
} from "@workspace/api-zod";
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  credentialsAreConfigured,
  credentialsMatch,
  getAdminSessionUsername,
} from "../lib/admin-session";

const router: IRouter = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/auth/session", (_req, res) => {
  res.json({
    authenticated: true,
    username: "BGL",
  });
});

router.post("/auth/login", (_req, res) => {
  createAdminSessionCookie(res, "BGL");
  res.json({
    authenticated: true,
    username: "BGL",
  });
});

router.post("/auth/logout", (_req, res) => {
  clearAdminSessionCookie(res);
  res.json(
    LogoutAdminResponse.parse({
      authenticated: false,
      username: null,
    }),
  );
});

export default router;
