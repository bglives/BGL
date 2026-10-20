import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { logger } from './lib/logger';
import { MatchManager } from './live/match-manager';

export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const manager = MatchManager.getInstance();

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    let currentMatchId: string | null = null;
    let unsubscribeSession: (() => void) | null = null;

    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const queryMatchId = url.searchParams.get('matchId');

    const joinMatch = (matchId: string) => {
      if (unsubscribeSession) {
        unsubscribeSession();
        unsubscribeSession = null;
      }

      currentMatchId = matchId;
      const session = manager.getSession(matchId);
      const stored = manager.getStoredMatch(matchId);

      if (!stored && !session) {
        ws.send(JSON.stringify({ type: 'error', message: `Partida ${matchId} não encontrada.` }));
        return;
      }

      // If session is already running, subscribe to it
      if (session) {
        unsubscribeSession = session.subscribe((payload) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
          }
        });
      } else {
        // Send initial match info if not yet started
        ws.send(
          JSON.stringify({
            type: 'match_info',
            match: stored,
            status: stored?.status || 'ready',
          }),
        );
      }
    };

    if (queryMatchId) {
      joinMatch(queryMatchId);
    }

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString('utf-8'));
        if (msg.type === 'join' && typeof msg.matchId === 'string') {
          joinMatch(msg.matchId);
        } else if (msg.type === 'leave') {
          if (unsubscribeSession) {
            unsubscribeSession();
            unsubscribeSession = null;
          }
          currentMatchId = null;
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (err) {
        logger.warn({ err }, 'Mensagem WebSocket inválida recebida');
      }
    });

    ws.on('close', () => {
      if (unsubscribeSession) {
        unsubscribeSession();
        unsubscribeSession = null;
      }
    });

    ws.on('error', (err) => {
      logger.error({ err, matchId: currentMatchId }, 'Erro no WebSocket client');
    });
  });

  logger.info('Servidor WebSocket ativo em /ws');
  return wss;
}
