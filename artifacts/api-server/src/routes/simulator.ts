import { Router, type IRouter } from 'express';
import { MatchManager } from '../live/match-manager';
import { SimulationProvider } from '../live/simulation-provider';
import { logger } from '../lib/logger';

const router: IRouter = Router();
const manager = MatchManager.getInstance();

// Trigger a gift in the simulation
router.post('/matches/:id/simulate/gift', (req, res): void => {
  const { id } = req.params;
  const session = manager.getSession(id);
  if (!session) {
    res.status(400).json({ error: 'Partida não está ativa no momento.' });
    return;
  }

  const { giftId, quantity = 1, giftName, donorName } = req.body;
  if (!giftId) {
    res.status(400).json({ error: 'giftId é obrigatório.' });
    return;
  }

  const provider = session.getProvider();
  if (provider instanceof SimulationProvider) {
    provider.simulateGift({
      giftId,
      giftName,
      quantity: Number(quantity) || 1,
      user: {
        nickname: donorName || 'Apoiador Simulado',
      },
    });
    res.json({ success: true, message: 'Presente simulado enviado com sucesso.' });
  } else {
    // If running in live mode, still allow manually triggering an event directly into the match session
    session.dispatch({
      type: 'GIFT_RECEIVED',
      eventId: `manual-gift-${Date.now()}`,
      giftId,
      quantity: Number(quantity) || 1,
      userId: `manual-${Date.now()}`,
      displayName: donorName || 'Apoiador Simulado',
      nowMs: Date.now(),
    });
    res.json({ success: true, message: 'Presente despachado diretamente na partida.' });
  }
});

// Trigger likes
router.post('/matches/:id/simulate/like', (req, res): void => {
  const { id } = req.params;
  const session = manager.getSession(id);
  if (!session) {
    res.status(400).json({ error: 'Partida não está ativa.' });
    return;
  }

  const { count = 10, side = 'A' } = req.body;
  session.dispatch({
    type: 'LIKE_RECEIVED',
    eventId: `manual-like-${Date.now()}`,
    side: side === 'B' ? 'B' : 'A',
    likes: Number(count) || 10,
    nowMs: Date.now(),
  });

  res.json({ success: true, message: 'Likes simulados com sucesso.' });
});

// Trigger chat comment (!a or !b)
router.post('/matches/:id/simulate/chat', (req, res): void => {
  const { id } = req.params;
  const session = manager.getSession(id);
  if (!session) {
    res.status(400).json({ error: 'Partida não está ativa.' });
    return;
  }

  const { comment, donorName } = req.body;
  const text = (comment || '').trim().toLowerCase();
  const candB = (session.config as any)?.candidateB;
  const numB = candB?.number ? String(candB.number).trim().toLowerCase() : null;
  const isB =
    text === 'b' ||
    text.startsWith('b ') ||
    text.startsWith('!b') ||
    (numB ? text === numB || text.startsWith(`${numB} `) || text.startsWith(`!${numB}`) : text.startsWith('!2'));
  const side = isB ? 'B' : 'A';

  session.dispatch({
    type: 'CHAT_VOTE',
    eventId: `manual-chat-${Date.now()}`,
    userId: `user-${donorName || 'chat'}-${Date.now()}`,
    side,
    nowMs: Date.now(),
  });

  res.json({ success: true, message: `Voto no chat (!${side.toLowerCase()}) computado.` });
});

// Trigger a burst of gifts (e.g. 50 gifts)
router.post('/matches/:id/simulate/burst', async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = manager.getSession(id);
  if (!session) {
    res.status(400).json({ error: 'Partida não está ativa.' });
    return;
  }

  const { giftId, totalGifts = 30, side = 'A' } = req.body;
  const targetGiftId =
    giftId ||
    (side === 'A'
      ? session.config.candidateA.gifts[0]?.id
      : session.config.candidateB.gifts[0]?.id);

  if (!targetGiftId) {
    res.status(400).json({ error: 'Nenhum giftId configurado para este lado.' });
    return;
  }

  logger.info({ matchId: id, targetGiftId, totalGifts }, 'Disparando rajada de presentes');

  // Send in 3 rapid batches
  const batches = 3;
  const perBatch = Math.ceil(Number(totalGifts) / batches);

  for (let i = 0; i < batches; i++) {
    session.dispatch({
      type: 'GIFT_RECEIVED',
      eventId: `burst-${Date.now()}-${i}`,
      giftId: targetGiftId,
      quantity: perBatch,
      userId: `burst-donor-${side}`,
      displayName: `Tornado de Presentes ${side}`,
      nowMs: Date.now(),
    });
    await new Promise((r) => setTimeout(r, 80));
  }

  res.json({ success: true, message: `Rajada de ${totalGifts} presentes disparada com sucesso!` });
});

// Trigger turnaround scenario (comeback)
router.post('/matches/:id/simulate/turnaround', (req, res): void => {
  const { id } = req.params;
  const session = manager.getSession(id);
  if (!session) {
    res.status(400).json({ error: 'Partida não está ativa.' });
    return;
  }

  const state = session.getState();
  // Identify the trailing candidate
  const trailingSide: 'A' | 'B' = state.scoreA > state.scoreB ? 'B' : 'A';
  const targetGift =
    trailingSide === 'B'
      ? session.config.candidateB.gifts[session.config.candidateB.gifts.length - 1]
      : session.config.candidateA.gifts[session.config.candidateA.gifts.length - 1];

  const diff = Math.abs(state.scoreA - state.scoreB);
  const neededPoints = diff + 50;

  if (targetGift) {
    session.dispatch({
      type: 'GIFT_RECEIVED',
      eventId: `turnaround-${Date.now()}`,
      giftId: targetGift.id,
      quantity: Math.max(1, Math.ceil(neededPoints / (targetGift.votes || 1))),
      userId: `hero-${trailingSide}`,
      displayName: `O Salvador do Candidato ${trailingSide}`,
      nowMs: Date.now(),
    });
  }

  res.json({
    success: true,
    message: `Cenário de Virada disparado para o Candidato ${trailingSide}!`,
  });
});

export default router;
