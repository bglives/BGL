import { useEffect, useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  Radio,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type { BatalhaEffect, BatalhaState } from '@workspace/game-engine';
import { electionSound } from './sound-effects';

export type CandidateDisplay = {
  name: string;
  color: string;
  avatarUrl?: string;
  number?: string;
  gifts: {
    id: string;
    name: string;
    imageUrl?: string;
    votes: number;
    costCoins: number;
  }[];
};

export type GameScreenProps = {
  matchId?: string;
  title?: string;
  format?: 'vertical' | 'horizontal';
  backgroundImageUrl?: string;
  candidateA: CandidateDisplay;
  candidateB: CandidateDisplay;
  state: BatalhaState;
  effects?: BatalhaEffect[];
  connectionStatus?: string;
  onSimulateGift?: (giftId: string, quantity: number, side: 'A' | 'B', name: string) => void;
  onSimulateChat?: (comment: string) => void;
  onSimulateTurnaround?: () => void;
  onSimulateBurst?: (side: 'A' | 'B') => void;
  isObsMode?: boolean;
};

type FloatingBallot = {
  id: string;
  side: 'A' | 'B';
  votes: number;
  giftName: string;
  donorName: string;
  avatarUrl?: string;
  giftImageUrl?: string;
};

type VoteLogItem = {
  id: string;
  donorName: string;
  giftName: string;
  votes: number;
  side: 'A' | 'B';
  avatarUrl?: string;
  timestamp: number;
};

export function GameScreen({
  title = 'Eleição 2026 · Apuração em Tempo Real',
  backgroundImageUrl,
  candidateA,
  candidateB,
  state,
  effects = [],
  connectionStatus = 'connected',
  onSimulateGift,
  onSimulateChat,
  onSimulateTurnaround,
  onSimulateBurst,
  isObsMode = false,
}: GameScreenProps) {
  const [floatingBallots, setFloatingBallots] = useState<FloatingBallot[]>([]);
  const [voteLogs, setVoteLogs] = useState<VoteLogItem[]>([]);
  const [activeUrnaFlash, setActiveUrnaFlash] = useState<'A' | 'B' | null>(null);
  const [plantaoMessage, setPlantaoMessage] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(!isObsMode);
  const [isMuted, setIsMuted] = useState(false);

  const prevScoreA = useRef(state.scoreA);
  const prevScoreB = useRef(state.scoreB);
  const prevLeader = useRef<'A' | 'B' | null>(null);

  const totalScore = state.scoreA + state.scoreB;
  const pctA = totalScore > 0 ? ((state.scoreA / totalScore) * 100).toFixed(1) : '50.0';
  const pctB = totalScore > 0 ? ((state.scoreB / totalScore) * 100).toFixed(1) : '50.0';

  const currentLeader: 'A' | 'B' | null =
    state.scoreA > state.scoreB ? 'A' : state.scoreB > state.scoreA ? 'B' : null;

  // Monitorar efeitos recebidos do WebSocket e disparar animações e som da urna
  useEffect(() => {
    if (effects && effects.length > 0) {
      for (const eff of effects) {
        if (eff.type === 'animation') {
          electionSound.playUrnaBeep();
          setActiveUrnaFlash(eff.side);
          setTimeout(() => setActiveUrnaFlash(null), 600);

          // Criar cédula de voto flutuante entrando na urna
          const newBallot: FloatingBallot = {
            id: `ballot-${Date.now()}-${Math.random()}`,
            side: eff.side,
            votes: eff.points,
            giftName: eff.giftId,
            donorName: eff.donorName || 'Eleitor',
          };
          setFloatingBallots((prev) => [...prev.slice(-6), newBallot]);

          // Adicionar no feed lateral
          setVoteLogs((prev) => [
            {
              id: newBallot.id,
              donorName: eff.donorName || 'Eleitor',
              giftName: eff.giftId,
              votes: eff.points,
              side: eff.side,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 15),
          ]);
        } else if (eff.type === 'lead_change') {
          electionSound.playPlantaoAlert();
          const winnerName = eff.to === 'A' ? candidateA.name : candidateB.name;
          setPlantaoMessage(`URGENTE: VIRADA NA APURAÇÃO! ${winnerName.toUpperCase()} ASSUMIU A LIDERANÇA!`);
          setTimeout(() => setPlantaoMessage(null), 5000);
        } else if (eff.type === 'match_end') {
          electionSound.playFanfare();
        }
      }
    }
  }, [effects, candidateA.name, candidateB.name]);

  // Efeito sonoro da urna quando pontuação sobe diretamente
  useEffect(() => {
    const diffA = state.scoreA - prevScoreA.current;
    const diffB = state.scoreB - prevScoreB.current;

    if (diffA > 0 || diffB > 0) {
      electionSound.playUrnaBeep();
      setActiveUrnaFlash(diffA > 0 ? 'A' : 'B');
      setTimeout(() => setActiveUrnaFlash(null), 500);
    }

    if (prevLeader.current && currentLeader && prevLeader.current !== currentLeader) {
      electionSound.playPlantaoAlert();
      const leaderName = currentLeader === 'A' ? candidateA.name : candidateB.name;
      setPlantaoMessage(`URGENTE: VIRADA NA APURAÇÃO! ${leaderName.toUpperCase()} ASSUMIU A LIDERANÇA!`);
      setTimeout(() => setPlantaoMessage(null), 5000);
    }

    prevScoreA.current = state.scoreA;
    prevScoreB.current = state.scoreB;
    prevLeader.current = currentLeader;
  }, [state.scoreA, state.scoreB, currentLeader, candidateA.name, candidateB.name]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    electionSound.setMuted(next);
  };

  // Fotos padrão com recorte realista se o usuário não subiu foto PNG
  const defaultPhotoA =
    candidateA.avatarUrl ||
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80';
  const defaultPhotoB =
    candidateB.avatarUrl ||
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';

  return (
    <main
      className="election-arena"
      style={
        {
          '--cand-a-color': candidateA.color || '#10b981',
          '--cand-b-color': candidateB.color || '#ef4444',
          ...(backgroundImageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(7, 10, 18, 0.75), rgba(4, 9, 20, 0.90)), url(${backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}),
        } as React.CSSProperties
      }
    >
      {/* 1. CABEÇALHO ELEITORAL */}
      <header className="election-header">
        <div className="flex items-center gap-2.5">
          <img
            src="/bgl-logo.png"
            alt="BGL Logo"
            className="w-9 h-9 object-contain drop-shadow-[0_0_12px_rgba(0,210,255,0.85)]"
          />
          <div className="election-live-badge">
            <span className="live-dot" />
            <Radio size={14} className="animate-pulse" />
            <span>AO VIVO · APURAÇÃO OFICIAL</span>
          </div>
        </div>
        <h1 className="election-title">{title}</h1>
        <div className="election-round-indicator">
          <Timer size={14} />
          <span>
            {state.phase === 'contagem-inicial'
              ? 'ABRINDO AS URNAS...'
              : state.phase === 'finalizado'
                ? 'APURAÇÃO ENCERRADA'
                : state.doubleActive
                  ? '🔥 BOCA DE URNA · VOTOS EM DOBRO!'
                  : 'VOTAÇÃO ABERTA'}
          </span>
        </div>
      </header>

      {/* BANNER DE PLANTÃO URGENTE (VIRADA) */}
      {plantaoMessage && (
        <aside className="plantao-banner" role="alert">
          <Flame size={20} className="plantao-icon" />
          <strong>{plantaoMessage}</strong>
        </aside>
      )}

      {/* 2. O PALCO DA DISPUTA: CANDIDATO A | URNA ELETRÔNICA | CANDIDATO B */}
      <section className="election-stage">
        {/* CANDIDATO A (LADO ESQUERDO) */}
        <article className={`candidate-podium side-a ${currentLeader === 'A' ? 'is-leader' : ''}`}>
          {currentLeader === 'A' && (
            <div className="leader-crown">
              <Trophy size={16} />
              <span>1º LUGAR</span>
            </div>
          )}

          <div className="candidate-photo-frame">
            <img
              src={defaultPhotoA}
              alt={`Candidato ${candidateA.name}`}
              className="candidate-photo"
            />
            <div className="podium-mic-cluster" />
          </div>

          <div className="podium-base">
            <span className="candidate-badge-num">10</span>
            <h2 className="candidate-name">{candidateA.name || 'Candidato 1'}</h2>
            <div className="candidate-live-votes">
              <span className="vote-counter">{state.scoreA.toLocaleString('pt-BR')}</span>
              <small>VOTOS</small>
            </div>
          </div>
        </article>

        {/* ======================================================== */}
        {/* 3. A URNA ELETRÔNICA CENTRAL (TOTEM DA APURAÇÃO) */}
        {/* ======================================================== */}
        <div className={`election-urna ${activeUrnaFlash ? `flash-${activeUrnaFlash.toLowerCase()}` : ''}`}>
          <div className="urna-top-bezel">
            <div className="urna-seal">
              <img src="/bgl-logo.png" alt="BGL" className="w-5 h-5 object-contain" />
              <span>BGL · URNA ELETRÔNICA</span>
            </div>
            <div className="urna-status-led" />
          </div>

          {/* FENDA DE INSERÇÃO DOS VOTOS */}
          <div className="urna-ballot-slot" title="Fenda de recepção de votos">
            <span className="slot-label">ENTRADA DE VOTOS</span>
            <div className="slot-opening" />
            <span className="slot-glow" />
          </div>

          {/* VISOR DIGITAL DE APURAÇÃO */}
          <div className="urna-digital-display">
            <div className="display-side cand-a">
              <span className="display-cand-label">{candidateA.name || 'CANDIDATO 1'}</span>
              <div className="display-score">{state.scoreA.toLocaleString('pt-BR')}</div>
              <div className="display-pct">{pctA}%</div>
            </div>

            <div className="display-divider">
              <span>VS</span>
            </div>

            <div className="display-side cand-b">
              <span className="display-cand-label">{candidateB.name || 'CANDIDATO 2'}</span>
              <div className="display-score">{state.scoreB.toLocaleString('pt-BR')}</div>
              <div className="display-pct">{pctB}%</div>
            </div>
          </div>

          {/* BARRA DE PROPORÇÃO DE VOTOS INTEGRADA */}
          <div className="urna-meter-bar">
            <div className="meter-fill fill-a" style={{ width: `${pctA}%` }} />
            <div className="meter-fill fill-b" style={{ width: `${pctB}%` }} />
          </div>

          {/* TECLADO / CONFIRMAÇÃO SIMULADA DA URNA */}
          <div className="urna-confirm-panel">
            <span className="urna-status-text">
              {activeUrnaFlash ? 'VOTO COMPUTADO! PIRILILI!' : 'AGUARDANDO SEU VOTO...'}
            </span>
            <div className="urna-btn-confirma">
              <CheckCircle2 size={13} />
              <span>CONFIRMA</span>
            </div>
          </div>

          {/* CÉDULAS DE VOTO ANIMADAS ENTRANDO NA URNA */}
          {floatingBallots.map((b) => (
            <div key={b.id} className={`floating-ballot-vote to-side-${b.side.toLowerCase()}`}>
              <Sparkles size={14} />
              <span>
                +{b.votes} VOTOS ({b.donorName})
              </span>
            </div>
          ))}
        </div>

        {/* CANDIDATO B (LADO DIREITO) */}
        <article className={`candidate-podium side-b ${currentLeader === 'B' ? 'is-leader' : ''}`}>
          {currentLeader === 'B' && (
            <div className="leader-crown">
              <Trophy size={16} />
              <span>1º LUGAR</span>
            </div>
          )}

          <div className="candidate-photo-frame">
            <img
              src={defaultPhotoB}
              alt={`Candidato ${candidateB.name}`}
              className="candidate-photo"
            />
            <div className="podium-mic-cluster" />
          </div>

          <div className="podium-base">
            <span className="candidate-badge-num">20</span>
            <h2 className="candidate-name">{candidateB.name || 'Candidato 2'}</h2>
            <div className="candidate-live-votes">
              <span className="vote-counter">{state.scoreB.toLocaleString('pt-BR')}</span>
              <small>VOTOS</small>
            </div>
          </div>
        </article>
      </section>

      {/* 4. FAIXA "TÍTULO DE ELEITOR: COMO VOTAR" (TIKTOK SAFE AREA) */}
      <footer className="election-how-to-vote">
        <div className="vote-instructions-header">
          <span>🗳️ COMO VOTAR: ENVIE OS PRESENTES ABAIXO OU DIGITE NO CHAT</span>
        </div>

        <div className="instructions-columns">
          {/* Instruções Candidato A */}
          <div className="candidate-gifts-row side-a">
            <span className="vote-call">
              Votar em <strong>{candidateA.name || 'Candidato 1'}</strong> (digite <code>A</code> ou <code>10</code>)
            </span>
            <div className="gifts-strip">
              {candidateA.gifts.map((g) => (
                <div
                  key={g.id || g.name}
                  className="gift-vote-chip"
                  onClick={() => onSimulateGift?.(g.id, 1, 'A', g.name)}
                  title={`Clique para simular: ${g.name} (+${g.votes} votos)`}
                >
                  <span className="gift-name">{g.name || 'Rosa'}</span>
                  <span className="gift-val">+{g.votes}v</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instruções Candidato B */}
          <div className="candidate-gifts-row side-b">
            <span className="vote-call">
              Votar em <strong>{candidateB.name || 'Candidato 2'}</strong> (digite <code>B</code> ou <code>20</code>)
            </span>
            <div className="gifts-strip">
              {candidateB.gifts.map((g) => (
                <div
                  key={g.id || g.name}
                  className="gift-vote-chip"
                  onClick={() => onSimulateGift?.(g.id, 1, 'B', g.name)}
                  title={`Clique para simular: ${g.name} (+${g.votes} votos)`}
                >
                  <span className="gift-name">{g.name || 'Coração'}</span>
                  <span className="gift-val">+{g.votes}v</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* 5. FEED LATERAL DE VOTOS RECENTES */}
      <aside className="election-vote-feed" aria-label="Últimos votos apurados">
        <div className="feed-header">
          <Radio size={12} className="animate-pulse text-emerald-400" />
          <span>ÚLTIMOS VOTOS</span>
        </div>
        <div className="feed-list">
          {voteLogs.slice(0, 6).map((log) => (
            <div key={log.id} className={`feed-item item-${log.side.toLowerCase()}`}>
              <div className="feed-donor">{log.donorName}</div>
              <div className="feed-detail">
                votou +{log.votes} para {log.side === 'A' ? candidateA.name : candidateB.name}
              </div>
            </div>
          ))}
          {voteLogs.length === 0 && (
            <div className="feed-empty">Envie um presente para registrar seu voto na urna!</div>
          )}
        </div>
      </aside>

      {/* 6. BOTÕES DE CONTROLE E SIMULADOR PARA TESTE IMEDIATO */}
      {!isObsMode && (
        <div className="election-controls-bar">
          <button
            type="button"
            className="ctrl-btn"
            onClick={toggleMute}
            title={isMuted ? 'Ativar Som da Urna' : 'Silenciar'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isMuted ? 'Mudo' : 'Som Urna'}</span>
          </button>

          <button
            type="button"
            className="ctrl-btn sim-toggle"
            onClick={() => setShowSimulator((s) => !s)}
          >
            <Zap size={15} />
            <span>{showSimulator ? 'Ocultar Simulador' : 'Simulador de Votos'}</span>
          </button>
        </div>
      )}

      {/* PAINEL DO SIMULADOR (PARA TESTAR COM 1 CLIQUE) */}
      {showSimulator && !isObsMode && (
        <div className="election-sim-panel">
          <div className="sim-panel-title">
            <Zap size={14} className="text-amber-400" />
            <span>Simulador de Eleição (Teste sem live real)</span>
          </div>

          <div className="sim-actions-grid">
            <button
              type="button"
              className="sim-btn btn-cand-a"
              onClick={() => onSimulateGift?.(candidateA.gifts[0]?.id || 'rose-a', 1, 'A', 'Rosa')}
            >
              +1 Voto ({candidateA.name || 'Cand. 1'})
            </button>

            <button
              type="button"
              className="sim-btn btn-cand-a"
              onClick={() => onSimulateGift?.(candidateA.gifts[1]?.id || 'donut-a', 5, 'A', 'Donut')}
            >
              +5 Votos ({candidateA.name || 'Cand. 1'})
            </button>

            <button
              type="button"
              className="sim-btn btn-cand-b"
              onClick={() => onSimulateGift?.(candidateB.gifts[0]?.id || 'rose-b', 1, 'B', 'Coração')}
            >
              +1 Voto ({candidateB.name || 'Cand. 2'})
            </button>

            <button
              type="button"
              className="sim-btn btn-cand-b"
              onClick={() => onSimulateGift?.(candidateB.gifts[1]?.id || 'donut-b', 5, 'B', 'Donut')}
            >
              +5 Votos ({candidateB.name || 'Cand. 2'})
            </button>

            <button
              type="button"
              className="sim-btn btn-special"
              onClick={() => onSimulateChat?.('a')}
            >
              Comentar "A" (+1)
            </button>

            <button
              type="button"
              className="sim-btn btn-special"
              onClick={() => onSimulateChat?.('b')}
            >
              Comentar "B" (+1)
            </button>

            <button
              type="button"
              className="sim-btn btn-burst"
              onClick={() => onSimulateBurst?.(Math.random() > 0.5 ? 'A' : 'B')}
            >
              Rajada de Votos (50)
            </button>

            <button
              type="button"
              className="sim-btn btn-turnaround"
              onClick={() => onSimulateTurnaround?.()}
            >
              🔥 Disparar Virada!
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL DE VITÓRIA / ENCERRAMENTO OFICIAL DAS ELEIÇÕES */}
      {state.phase === 'finalizado' && (
        <div className="election-winner-modal" role="dialog" aria-modal="true">
          <div className="winner-backdrop" />
          <div className="winner-card">
            <div className="winner-ribbon">
              <img src="/bgl-logo.png" alt="BGL" className="w-8 h-8 object-contain drop-shadow-[0_0_12px_#00d2ff]" />
              <Trophy size={22} className="text-amber-300 animate-bounce" />
              <span>RESULTADO OFICIAL DAS URNAS · BGL</span>
            </div>

            <h2 className="winner-proclamation">
              {state.winner === 'A'
                ? `${candidateA.name.toUpperCase()} ELEITO!`
                : state.winner === 'B'
                  ? `${candidateB.name.toUpperCase()} ELEITO!`
                  : 'ELEIÇÃO TERMINOU EM EMPATE!'}
            </h2>

            <div className="winner-avatar-spotlight">
              <img
                src={
                  state.winner === 'A'
                    ? defaultPhotoA
                    : state.winner === 'B'
                      ? defaultPhotoB
                      : defaultPhotoA
                }
                alt="Candidato Vencedor"
                className="winner-photo"
              />
              <span className="winner-laurel">👑</span>
            </div>

            <div className="winner-stats-grid">
              <div className="winner-stat-box side-a">
                <span className="stat-label">{candidateA.name || 'Candidato 1'}</span>
                <span className="stat-val">{state.scoreA.toLocaleString('pt-BR')}</span>
                <span className="stat-pct">{pctA}%</span>
              </div>
              <div className="winner-stat-box side-b">
                <span className="stat-label">{candidateB.name || 'Candidato 2'}</span>
                <span className="stat-val">{state.scoreB.toLocaleString('pt-BR')}</span>
                <span className="stat-pct">{pctB}%</span>
              </div>
            </div>

            <button
              type="button"
              className="winner-btn-restart"
              onClick={() => window.location.reload()}
            >
              Iniciar Nova Eleição
            </button>
          </div>
        </div>
      )}

      {/* 6. SLOGAN FIXO NO CANTO INFERIOR */}
      <div className="fixed bottom-3 right-3 z-40 pointer-events-none select-none flex items-center gap-2">
        <img
          src="/brazas-slogan.png"
          alt="Brazas Gaming Lives"
          className="h-11 w-auto object-contain opacity-90 drop-shadow-[0_0_14px_rgba(0,180,216,0.7)]"
        />
      </div>
    </main>
  );
}

export default GameScreen;
