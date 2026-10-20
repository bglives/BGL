import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// The generated web client treats 304 as an error; API responses are dynamic
// and should not be conditionally cached.
app.set("etag", false);
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

app.use("/api", router);

// Serve frontend static build if present (for single-service deployment on Railway)
const candidateDirs = [
  path.resolve(process.cwd(), "artifacts/livearena/dist/public"),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../livearena/dist/public"),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../livearena/dist/public"),
  path.resolve(process.cwd(), "dist/public"),
];

const publicDir = candidateDirs.find((dir) => fs.existsSync(dir));

if (publicDir) {
  logger.info({ publicDir }, "Servindo frontend a partir de diretório estático");
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
      return next();
    }
    const indexPath = path.join(publicDir, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

export default app;
