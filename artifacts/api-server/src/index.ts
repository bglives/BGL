import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocketServer } from "./websocket";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

// Attach WebSocket server for real-time live events and state synchronization
setupWebSocketServer(server);

server.listen(port, "0.0.0.0", () => {
  logger.info({ port }, `B.G.L Brazas Gaming Live API & WebSocket server escutando em 0.0.0.0:${port}`);
});
