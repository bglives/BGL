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

router.get("/auth/session", (req, res) => {
  const username = getAdminSessionUsername(req);
  const response = GetAuthSessionResponse.parse({
    authenticated: Boolean(username),
    username: username ?? null,
  });
  res.json(response);
});

router.post("/auth/login", (req, res) => {
  const parsed = LoginAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe o usuário e a senha." });
    return;
  }

  if (!credentialsAreConfigured()) {
    req.log.error("Admin login configuration is incomplete");
    res.status(503).json({ error: "O acesso de administrador não está configurado." });
    return;
  }

  if (!credentialsMatch(parsed.data.username, parsed.data.password)) {
    res.status(401).json({ error: "Usuário ou senha inválidos." });
    return;
  }

  const username = parsed.data.username.trim();
  createAdminSessionCookie(res, username);
  res.json(
    LoginAdminResponse.parse({
      authenticated: true,
      username,
    }),
  );
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
