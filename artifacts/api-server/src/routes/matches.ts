import { Router, type IRouter } from 'express';
import { MatchManager } from '../live/match-manager';
import { logger } from '../lib/logger';

const router: IRouter = Router();
const manager = MatchManager.getInstance();

// List all matches
router.get('/matches', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const matches = manager.listStoredMatches();
  res.json({ matches });
});

// Create a new match
router.post('/matches', (req, res): void => {
  try {
    const { title, config, tiktokUsername, isSimulation } = req.body;
    if (!config) {
      res.status(400).json({ error: 'Configuração do jogo é obrigatória.' });
      return;
    }

    const created = manager.createMatch({
      title,
      config,
      tiktokUsername,
      isSimulation,
    });

    res.status(201).json({ match: created });
  } catch (err: any) {
    logger.error({ err }, 'Erro ao criar partida');
    res.status(500).json({ error: err?.message || 'Não foi possível criar a partida.' });
  }
});

// Get match info & current state
router.get('/matches/:id', (req, res): void => {
  res.setHeader('Cache-Control', 'no-store');
  const { id } = req.params;
  const match = manager.getStoredMatch(id);
  if (!match) {
    res.status(404).json({ error: 'Partida não encontrada.' });
    return;
  }

  const session = manager.getSession(id);
  res.json({
    match,
    state: session ? session.getState() : null,
    status: session ? session.getStatus() : match.status,
  });
});

// Start match
router.post('/matches/:id/start', async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    const session = await manager.startMatch(id);
    res.json({
      success: true,
      status: session.getStatus(),
      state: session.getState(),
    });
  } catch (err: any) {
    logger.error({ err, matchId: id }, 'Erro ao iniciar partida');
    res.status(500).json({ error: err?.message || 'Erro ao iniciar partida.' });
  }
});

// Stop match
router.post('/matches/:id/stop', async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    await manager.stopMatch(id);
    res.json({ success: true, message: 'Partida encerrada com sucesso.' });
  } catch (err: any) {
    logger.error({ err, matchId: id }, 'Erro ao encerrar partida');
    res.status(500).json({ error: err?.message || 'Erro ao encerrar partida.' });
  }
});

export default router;
