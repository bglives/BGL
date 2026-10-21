import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  Radio,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
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
};

export function GameScreen({
  title = 'Eleição 2026 · Apuração em Tempo Real',
  backgroundImageUrl,
  candidateA,
  candidateB,
  state,
  effects = [],
  isObsMode = false,
}: GameScreenProps) {
  const [floatingBallots, setFloatingBallots] = useState<FloatingBallot[]>([]);
  const [activeUrnaFlash, setActiveUrnaFlash] = useState<'A' | 'B' | null>(null);
  const [plantaoMessage, setPlantaoMessage] = useState<string | null>(null);
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

          const newBallot: FloatingBallot = {
            id: `ballot-${Date.now()}-${Math.random()}`,
            side: eff.side,
            votes: eff.points,
            giftName: eff.giftId,
            donorName: eff.donorName || 'Eleitor',
          };
          setFloatingBallots((prev) => [...prev.slice(-4), newBallot]);
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

  const defaultPhotoA =
    candidateA.avatarUrl ||
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80';
  const defaultPhotoB =
    candidateB.avatarUrl ||
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';

  const numCandidateA = candidateA.number?.trim() || '13';
  const numCandidateB = candidateB.number?.trim() || '22';

  // Montar strings do ticker contínuo para cada candidato
  const giftsTextA = candidateA.gifts
    .map((g) => `${g.name || 'Presente'} +${g.votes}v`)
    .join('  •  ');
  const giftsTextB = candidateB.gifts
    .map((g) => `${g.name || 'Presente'} +${g.votes}v`)
    .join('  •  ');

  const tickerSegmentA = `CANDIDATO [${numCandidateA}] ${candidateA.name?.toUpperCase() || 'LULA'}  •  Comente "${numCandidateA}" (+1v)  •  ${giftsTextA}`;
  const tickerSegmentB = `CANDIDATO [${numCandidateB}] ${candidateB.name?.toUpperCase() || 'BOLSONARO'}  •  Comente "${numCandidateB}" (+1v)  •  ${giftsTextB}`;

  return (
    <main
      className="election-arena"
      style={
        {
          '--cand-a-color': candidateA.color || '#ef4444',
          '--cand-b-color': candidateB.color || '#22c55e',
          ...(backgroundImageUrl
            ? {
                backgroundImage: `url(${backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: 'transparent',
              }
            : {}),
        } as React.CSSProperties
      }
    >
      {/* 1. CABEÇALHO ELEITORAL COMPACTO E LIMPO (SEM LOGO BGL) */}
      <header className="election-header">
        <div className="flex items-center gap-2">
          <div className="election-live-badge">
            <span className="live-dot" />
            <Radio size={13} className="animate-pulse" />
            <span>AO VIVO · APURAÇÃO</span>
          </div>
        </div>

        <h1 className="election-title">{title}</h1>

        <div className="flex items-center gap-2">
          <div className="election-round-indicator">
            <Timer size={13} />
            <span>
              {state.phase === 'contagem-inicial'
                ? 'ABRINDO URNAS'
                : state.phase === 'finalizado'
                  ? 'ENCERRADO'
                  : state.doubleActive
                    ? '🔥 VOTOS EM DOBRO'
                    : 'VOTAÇÃO ABERTA'}
            </span>
          </div>

          {!isObsMode && (
            <button
              type="button"
              className="urna-sound-toggle-btn"
              onClick={toggleMute}
              title={isMuted ? 'Ativar som da urna' : 'Silenciar urna'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}
        </div>
      </header>

      {/* BANNER DE PLANTÃO URGENTE (VIRADA) */}
      {plantaoMessage && (
        <aside className="plantao-banner" role="alert">
          <Flame size={18} className="plantao-icon" />
          <strong>{plantaoMessage}</strong>
        </aside>
      )}

      {/* 2. LINHAS FINAS EM LOOP INFINITO (TICKERS MARQUEE) SOBRE A URNA */}
      <section className="election-tickers-wrapper" aria-label="Instruções de votação">
        {/* Linha 1: Candidato 13 */}
        <div className="minimal-ticker-row side-a">
          <div className="ticker-badge-pill">13</div>
          <div className="ticker-track-viewport">
            <div className="ticker-track-content">
              <span>{tickerSegmentA}</span>
              <span className="ticker-spacer">✦</span>
              <span>{tickerSegmentA}</span>
              <span className="ticker-spacer">✦</span>
            </div>
          </div>
        </div>

        {/* Linha 2: Candidato 22 */}
        <div className="minimal-ticker-row side-b">
          <div className="ticker-badge-pill">22</div>
          <div className="ticker-track-viewport">
            <div className="ticker-track-content">
              <span>{tickerSegmentB}</span>
              <span className="ticker-spacer">✦</span>
              <span>{tickerSegmentB}</span>
              <span className="ticker-spacer">✦</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. O PALCO DA DISPUTA: QUADRADOS PEQUENOS LADO A LADO DOS CANDIDATOS */}
      <section className="election-stage">
        {/* QUADRADOS PEQUENOS LADO A LADO */}
        <div className="candidates-side-by-side">
          {/* CANDIDATO A (QUADRADO PEQUENO) */}
          <article className={`candidate-square side-a ${currentLeader === 'A' ? 'is-leader' : ''}`}>
            {currentLeader === 'A' && (
              <div className="leader-crown">
                <Trophy size={12} />
                <span>1º LUGAR</span>
              </div>
            )}

            <div className="candidate-square-photo-frame">
              <img
                src={defaultPhotoA}
                alt={`Candidato ${candidateA.name}`}
                className="candidate-square-photo"
              />
            </div>

            <div className="candidate-square-info">
              <h2 className="candidate-name">{candidateA.name || 'Lula'}</h2>
              <div className="candidate-live-votes">
                <span className="vote-counter">{state.scoreA.toLocaleString('pt-BR')}</span>
                <small>VOTOS</small>
              </div>
            </div>
          </article>

          {/* CANDIDATO B (QUADRADO PEQUENO) */}
          <article className={`candidate-square side-b ${currentLeader === 'B' ? 'is-leader' : ''}`}>
            {currentLeader === 'B' && (
              <div className="leader-crown">
                <Trophy size={12} />
                <span>1º LUGAR</span>
              </div>
            )}

            <div className="candidate-square-photo-frame">
              <img
                src={defaultPhotoB}
                alt={`Candidato ${candidateB.name}`}
                className="candidate-square-photo"
              />
            </div>

            <div className="candidate-square-info">
              <h2 className="candidate-name">{candidateB.name || 'Bolsonaro'}</h2>
              <div className="candidate-live-votes">
                <span className="vote-counter">{state.scoreB.toLocaleString('pt-BR')}</span>
                <small>VOTOS</small>
              </div>
            </div>
          </article>
        </div>

        {/* ======================================================== */}
        {/* URNA ELETRÔNICA CENTRAL (COMPACTA, MENOR E SEM LOGO BGL) */}
        {/* ======================================================== */}
        <div className={`election-urna ${activeUrnaFlash ? `flash-${activeUrnaFlash.toLowerCase()}` : ''}`}>
          <div className="urna-top-bezel">
            <div className="urna-seal">
              <span className="urna-dot-indicator" />
              <span>URNA ELETRÔNICA</span>
            </div>
            <div className="urna-status-led" />
          </div>

          {/* VISOR DIGITAL DE APURAÇÃO COMPACTO */}
          <div className="urna-digital-display">
            <div className="display-side cand-a">
              <span className="display-cand-label">{candidateA.name || 'LULA'}</span>
              <div className="display-score">{state.scoreA.toLocaleString('pt-BR')}</div>
              <div className="display-pct">{pctA}%</div>
            </div>

            <div className="display-divider">
              <span>VS</span>
            </div>

            <div className="display-side cand-b">
              <span className="display-cand-label">{candidateB.name || 'BOLSONARO'}</span>
              <div className="display-score">{state.scoreB.toLocaleString('pt-BR')}</div>
              <div className="display-pct">{pctB}%</div>
            </div>
          </div>

          {/* BARRA DE PROPORÇÃO DE VOTOS INTEGRADA */}
          <div className="urna-meter-bar">
            <div className="meter-fill fill-a" style={{ width: `${pctA}%` }} />
            <div className="meter-fill fill-b" style={{ width: `${pctB}%` }} />
          </div>

          {/* CONFIRMAÇÃO COMPACTA */}
          <div className="urna-confirm-panel">
            <span className="urna-status-text">
              {activeUrnaFlash ? 'VOTO COMPUTADO!' : 'DIGITE NO CHAT OU ENVIE PRESENTES'}
            </span>
            <div className="urna-btn-confirma">
              <CheckCircle2 size={12} />
              <span>CONFIRMA</span>
            </div>
          </div>

          {/* CÉDULAS DE VOTO ANIMADAS ENTRANDO NA URNA */}
          {floatingBallots.map((b) => (
            <div key={b.id} className={`floating-ballot-vote to-side-${b.side.toLowerCase()}`}>
              <Sparkles size={13} />
              <span>
                +{b.votes} VOTOS ({b.donorName})
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. MODAL DE VITÓRIA / ENCERRAMENTO OFICIAL DAS ELEIÇÕES (SEM BGL) */}
      {state.phase === 'finalizado' && (
        <div className="election-winner-modal" role="dialog" aria-modal="true">
          <div className="winner-backdrop" />
          <div className="winner-card">
            <div className="winner-ribbon">
              <Trophy size={20} className="text-amber-300 animate-bounce" />
              <span>RESULTADO OFICIAL DAS URNAS</span>
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
    </main>
  );
}

export default GameScreen;
