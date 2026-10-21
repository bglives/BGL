import { useEffect, useState } from 'react';
import { useParams, useSearch } from 'wouter';
import type { BatalhaEffect, BatalhaState } from '@workspace/game-engine';
import { createInitialState } from '@workspace/game-engine';
import { GameScreen, type CandidateDisplay } from '@/games/batalha-de-votos/GameScreen';

const defaultCandidateA: CandidateDisplay = {
  name: 'Candidato 1',
  color: '#10b981',
  number: '',
  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
  gifts: [
    { id: 'gift-rose', name: 'Rosa', votes: 1, costCoins: 1 },
    { id: 'gift-ice-cream', name: 'Sorvete', votes: 2, costCoins: 2 },
    { id: 'gift-donut', name: 'Donut', votes: 5, costCoins: 5 },
    { id: 'gift-perfume', name: 'Perfume', votes: 10, costCoins: 10 },
    { id: 'gift-lion', name: 'Leão Presidencial', votes: 50, costCoins: 50 },
  ],
};

const defaultCandidateB: CandidateDisplay = {
  name: 'Candidato 2',
  color: '#ef4444',
  number: '',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
  gifts: [
    { id: 'gift-heart', name: 'Coração', votes: 1, costCoins: 1 },
    { id: 'gift-coffee', name: 'Café', votes: 2, costCoins: 2 },
    { id: 'gift-crown', name: 'Coroa', votes: 5, costCoins: 5 },
    { id: 'gift-rocket', name: 'Foguete', votes: 10, costCoins: 10 },
    { id: 'gift-trophy', name: 'Troféu Eleitoral', votes: 50, costCoins: 50 },
  ],
};

export function PlayGame() {
  const { matchId } = useParams<{ matchId?: string }>();
  const search = useSearch();
  const isObsMode = search.includes('obs=true');

  const [title, setTitle] = useState('Eleição 2026 · Apuração ao Vivo');
  const [candidateA, setCandidateA] = useState<CandidateDisplay>(defaultCandidateA);
  const [candidateB, setCandidateB] = useState<CandidateDisplay>(defaultCandidateB);
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);

  // Carregar configuração salva localmente (caso esteja testando sem ID ou para ter prévia instantânea)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('livearena_active_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.config?.backgroundImage || parsed.config?.backgroundDataUrl) {
          setBackgroundImage(parsed.config.backgroundDataUrl || parsed.config.backgroundImage);
        }
        if (parsed.config?.candidateA) {
          const ca = parsed.config.candidateA;
          setCandidateA((prev) => ({
            ...prev,
            name: ca.name || prev.name,
            number: ca.number !== undefined ? ca.number : prev.number,
            color: ca.color || prev.color,
            avatarUrl: ca.avatarDataUrl || ca.avatarUrl || prev.avatarUrl,
            gifts: ca.gifts?.length ? ca.gifts : prev.gifts,
          }));
        }
        if (parsed.config?.candidateB) {
          const cb = parsed.config.candidateB;
          setCandidateB((prev) => ({
            ...prev,
            name: cb.name || prev.name,
            number: cb.number !== undefined ? cb.number : prev.number,
            color: cb.color || prev.color,
            avatarUrl: cb.avatarDataUrl || cb.avatarUrl || prev.avatarUrl,
            gifts: cb.gifts?.length ? cb.gifts : prev.gifts,
          }));
        }
      }
    } catch {}
  }, []);

  const [state, setState] = useState<BatalhaState>(() =>
    createInitialState({
      candidateA: { gifts: defaultCandidateA.gifts },
      candidateB: { gifts: defaultCandidateB.gifts },
      mode: 'single',
      roundMinutes: '5',
      intermissionSeconds: 20,
      tieRule: 'draw',
      doubleLastMinute: true,
      leadChangeOvertime: true,
      overtimeSeconds: 20,
      maxOvertimes: 2,
      likesEnergy: true,
      energyBonusThreshold: 100,
      energyBonusPoints: 5,
      energyBonusCap: 20,
      chatCommands: true,
      collectiveGoals: [],
      surpriseEvents: false,
      powerUps: false,
      powerUpEffect: 'shield',
      smallThreshold: 1,
      mediumThreshold: 10,
      epicThreshold: 50,
    }),
  );

  const [effects, setEffects] = useState<BatalhaEffect[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');

  // Buscar dados da partida da API se matchId fornecido
  useEffect(() => {
    if (!matchId) return;

    fetch(`/api/matches/${matchId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.match?.config) {
          const cfg = data.match.config;
          if (data.match.title) setTitle(data.match.title);
          if (cfg.backgroundDataUrl || cfg.backgroundImage) {
            setBackgroundImage(cfg.backgroundDataUrl || cfg.backgroundImage);
          }

          if (cfg.candidateA) {
            setCandidateA((prev) => ({
              ...prev,
              name: cfg.candidateA.name || prev.name,
              number: cfg.candidateA.number !== undefined ? cfg.candidateA.number : prev.number,
              color: cfg.candidateA.color || prev.color,
              avatarUrl: cfg.candidateA.avatarDataUrl || prev.avatarUrl,
              gifts: cfg.candidateA.gifts?.length ? cfg.candidateA.gifts : prev.gifts,
            }));
          }

          if (cfg.candidateB) {
            setCandidateB((prev) => ({
              ...prev,
              name: cfg.candidateB.name || prev.name,
              number: cfg.candidateB.number !== undefined ? cfg.candidateB.number : prev.number,
              color: cfg.candidateB.color || prev.color,
              avatarUrl: cfg.candidateB.avatarDataUrl || prev.avatarUrl,
              gifts: cfg.candidateB.gifts?.length ? cfg.candidateB.gifts : prev.gifts,
            }));
          }
        }
        if (data?.state) {
          setState(data.state);
        }
      })
      .catch(() => {});
  }, [matchId]);

  // Conectar ao WebSocket para eventos em tempo real
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws${matchId ? `?matchId=${matchId}` : ''}`;
    let ws: WebSocket | null = null;
    let timer: NodeJS.Timeout | null = null;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'state' && data.state) {
              setState(data.state);
            } else if (data.type === 'effects' && data.effects) {
              setEffects(data.effects);
              if (data.state) setState(data.state);
            } else if (data.type === 'status') {
              setConnectionStatus(data.status);
            }
          } catch {}
        };

        ws.onclose = () => {
          setConnectionStatus('reconnecting');
          timer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setConnectionStatus('error');
        };
      } catch {
        setConnectionStatus('disconnected');
      }
    }

    connect();

    return () => {
      if (timer) clearTimeout(timer);
      if (ws) ws.close();
    };
  }, [matchId]);

  // Funções de simulação para testar diretamente na tela
  const handleSimulateGift = (giftId: string, quantity: number, side: 'A' | 'B', name: string) => {
    if (matchId) {
      fetch(`/api/matches/${matchId}/simulate/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giftId,
          quantity,
          giftName: name,
          donorName: `Eleitor ${side}`,
        }),
      }).catch(() => {});
    }

    // Atualização local imediata para resposta instantânea
    setState((prev) => ({
      ...prev,
      scoreA: side === 'A' ? prev.scoreA + quantity : prev.scoreA,
      scoreB: side === 'B' ? prev.scoreB + quantity : prev.scoreB,
    }));
  };

  const handleSimulateChat = (comment: string) => {
    if (matchId) {
      fetch(`/api/matches/${matchId}/simulate/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      }).catch(() => {});
    }

    const side = comment.startsWith('!b') ? 'B' : 'A';
    setState((prev) => ({
      ...prev,
      scoreA: side === 'A' ? prev.scoreA + 1 : prev.scoreA,
      scoreB: side === 'B' ? prev.scoreB + 1 : prev.scoreB,
    }));
  };

  const handleSimulateBurst = (side: 'A' | 'B') => {
    if (matchId) {
      fetch(`/api/matches/${matchId}/simulate/burst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, totalGifts: 50 }),
      }).catch(() => {});
    }

    setState((prev) => ({
      ...prev,
      scoreA: side === 'A' ? prev.scoreA + 50 : prev.scoreA,
      scoreB: side === 'B' ? prev.scoreB + 50 : prev.scoreB,
    }));
  };

  const handleSimulateTurnaround = () => {
    if (matchId) {
      fetch(`/api/matches/${matchId}/simulate/turnaround`, {
        method: 'POST',
      }).catch(() => {});
    }

    const trailing = state.scoreA > state.scoreB ? 'B' : 'A';
    const boost = Math.abs(state.scoreA - state.scoreB) + 30;
    setState((prev) => ({
      ...prev,
      scoreA: trailing === 'A' ? prev.scoreA + boost : prev.scoreA,
      scoreB: trailing === 'B' ? prev.scoreB + boost : prev.scoreB,
    }));
  };

  return (
    <GameScreen
      matchId={matchId}
      title={title}
      backgroundImageUrl={backgroundImage}
      candidateA={candidateA}
      candidateB={candidateB}
      state={state}
      effects={effects}
      connectionStatus={connectionStatus}
      onSimulateGift={handleSimulateGift}
      onSimulateChat={handleSimulateChat}
      onSimulateBurst={handleSimulateBurst}
      onSimulateTurnaround={handleSimulateTurnaround}
      isObsMode={isObsMode}
    />
  );
}

export default PlayGame;
