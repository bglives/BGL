import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  getGetAuthSessionQueryKey,
  getGetDashboardSummaryQueryKey,
  useGetAuthSession,
  useGetDashboardSummary,
  useLoginAdmin,
  useLogoutAdmin,
} from '@workspace/api-client-react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CircleHelp,
  Eye,
  EyeOff,
  Gamepad2,
  Info,
  Layers3,
  LogOut,
  Radio,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Swords,
  UsersRound,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { PlayGame } from '@/pages/play';
import { availableGames, findAvailableGame, futureGames } from '@/games/registry';

const queryClient = new QueryClient();

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-livearena">
      <img
        src="/bgl-logo.png"
        alt="BGL Logo"
        className="w-10 h-10 rounded-xl object-contain drop-shadow-[0_0_14px_rgba(0,210,255,0.75)]"
      />
      {!compact && (
        <span className="brand-word font-black text-2xl tracking-wider text-white">
          BGL
        </span>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-page" aria-label="Carregando painel" data-testid="status-loading">
      <div className="loading-card">
        <div className="flex items-center gap-3"><Brand /><span className="eyebrow">Preparando arena</span></div>
        <div className="skeleton wide" />
        <div className="skeleton short" />
        <div className="skeleton tile" />
      </div>
    </main>
  );
}

function QueryError({ onRetry, title = 'Não foi possível carregar o painel' }: { onRetry: () => void; title?: string }) {
  return (
    <main className="error-screen" data-testid="status-error">
      <section className="error-card">
        <div className="mb-4 text-rose-300"><CircleHelp size={25} /></div>
        <h2>{title}</h2>
        <p>Houve uma falha ao conectar com o BGL. Tente novamente em instantes.</p>
        <button className="btn-quiet inline-flex items-center gap-2" onClick={onRetry} data-testid="button-retry">
          <RotateCw size={13} /> Tentar novamente
        </button>
      </section>
    </main>
  );
}

function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const session = useGetAuthSession();
  const login = useLoginAdmin();

  useEffect(() => {
    if (session.data?.authenticated) setLocation('/');
  }, [session.data?.authenticated, setLocation]);

  if (session.isLoading) return <LoadingScreen />;
  if (session.isError) return <QueryError title="Não foi possível verificar o acesso" onRetry={() => void session.refetch()} />;
  if (session.data?.authenticated) return <LoadingScreen />;

  const handleOpenEnter = () => {
    login.mutate(
      { data: { username: 'BGL', password: 'open' } },
      {
        onSuccess: (authSession) => {
          queryClient.setQueryData(getGetAuthSessionQueryKey(), authSession);
          void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setLocation('/');
        },
        onError: () => setLocation('/'),
      },
    );
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="story-content">
          <div className="eyebrow flex items-center gap-2"><span className="live-pulse" /> CENTRAL DE COMANDO</div>
          <h1>Sua live.<br />Seu <em>jogo.</em></h1>
          <p>Prepare o próximo desafio, acompanhe a partida e transforme a conversa da sua live em uma arena de verdade.</p>
        </div>
        <div className="story-footer">INTERAÇÃO EM TEMPO REAL · AO VIVO COM SUA COMUNIDADE</div>
      </section>
      <section className="login-form-side">
        <div className="login-card">
          <div className="flex items-center justify-between">
            <Brand compact />
            <span className="rounded-full border border-[#343b42] px-2.5 py-1 text-[9px] font-bold tracking-[.12em] text-[#9299a7]">ACESSO LIVRE</span>
          </div>
          <h2>Painel de Controle</h2>
          <p className="intro">Clique abaixo para entrar diretamente no painel BGL sem necessidade de senha.</p>
          <div className="mt-6">
            <button
              type="button"
              className="btn-accent w-full py-3.5 text-base font-bold flex items-center justify-center gap-2"
              onClick={handleOpenEnter}
              data-testid="button-enter-bgl"
            >
              <span>Entrar no BGL</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function NavItem({ icon: Icon, children, active = false, href }: { icon: typeof Activity; children: ReactNode; active?: boolean; href?: string }) {
  if (href) return (
    <Link href={href} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} data-testid={`nav-${href === '/games' ? 'games' : 'overview'}`}>
      <Icon size={16} strokeWidth={1.8} /><span>{children}</span>
    </Link>
  );
  return (
    <div className={`nav-item ${active ? 'active' : 'disabled'}`} aria-current={active ? 'page' : undefined} data-testid={active ? 'nav-overview' : undefined}>
      <Icon size={16} strokeWidth={1.8} />
      <span>{children}</span>
      {!active && <span className="nav-soon">EM BREVE</span>}
    </div>
  );
}

function MetricCard({ label, value, detail, icon: Icon, color, testId }: {
  label: string; value: number; detail: string; icon: typeof Activity; color: string; testId: string;
}) {
  return (
    <article className="metric-card" style={{ '--metric-color': color, '--metric-glow': color } as CSSProperties} data-testid={testId}>
      <div className="metric-top"><span>{label}</span><Icon className="metric-icon" size={16} /></div>
      <div className="metric-value"><strong data-testid={`${testId}-value`}>{value}</strong><span>{detail}</span></div>
    </article>
  );
}

function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const session = useGetAuthSession();
  const summary = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey(), retry: false },
  });
  const logout = useLogoutAdmin();

  const totalMatches = summary.data?.totalMatches ?? 0;
  const activeMatches = summary.data?.activeMatches ?? 0;
  const finishedMatches = summary.data?.finishedMatches ?? 0;

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: (authSession) => {
        queryClient.setQueryData(getGetAuthSessionQueryKey(), authSession);
        queryClient.removeQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setLocation('/login');
      },
    });
  };
  const username = session.data?.username || 'Administrador';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="side-label">PAINEL</div>
        <nav aria-label="Navegação principal">
          <NavItem icon={BarChart3} active>Visão geral</NavItem>
          <NavItem icon={Gamepad2} href="/games">Biblioteca de jogos</NavItem>
          <NavItem icon={Swords} href="/play">Arena ao Vivo</NavItem>
          <NavItem icon={Radio} href="/games/batalha-de-votos/configure">Conexão TikTok LIVE</NavItem>
        </nav>
        <div className="sidebar-bottom">
          <div className="flex justify-center mb-2.5">
            <img
              src="/brazas-slogan.png"
              alt="Brazas Gaming Lives"
              className="h-8 w-auto object-contain opacity-85 drop-shadow-[0_0_10px_rgba(0,180,216,0.5)]"
            />
          </div>
          <div className="live-status">
            <div className="flex items-center gap-2"><span className="live-pulse" /><span className="text-[10px] font-bold text-[#e7e7df]">Central pronta</span></div>
            <p className="mb-0 mt-2 text-[9px] leading-relaxed text-[#828998]">Sua próxima transmissão começa com uma boa preparação.</p>
          </div>
          <button onClick={signOut} disabled={logout.isPending} className="nav-item mt-3 w-full border-0 bg-transparent text-left" data-testid="button-logout">
            <LogOut size={16} /><span>{logout.isPending ? 'Saindo…' : 'Sair da conta'}</span>
          </button>
        </div>
      </aside>
      <div className="mobile-top"><Brand /><div className="mobile-actions"><Link href="/games" className="btn-quiet" data-testid="link-games-mobile">Jogos</Link><button onClick={signOut} disabled={logout.isPending} className="btn-quiet" data-testid="button-logout-mobile">{logout.isPending ? 'Saindo…' : 'Sair'}</button></div></div>
      <div className="main-area">
        <header className="topbar">
          <div className="top-breadcrumb">Painel <span className="mx-2 text-[#555b69]">/</span> <span className="text-[#c3c7cf]">Visão geral</span></div>
          <div className="top-user">
            <div className="text-right">
              <div className="text-[10px] font-bold text-[#dbded9]" data-testid="text-username">{username}</div>
              <div className="mt-1 text-[8px] tracking-wide text-[#757b8b]">ADMINISTRADOR</div>
            </div>
            <div className="avatar-initial" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <main className="content-wrap">
          {logout.isError && <p className="form-error mb-4" role="alert" data-testid="status-logout-error">Não foi possível encerrar a sessão. Tente novamente.</p>}
          <div className="eyebrow">RESUMO DA ARENA</div>
          <h1 className="page-title" data-testid="heading-overview">Bom ter você de volta.</h1>
          <p className="page-subtitle">Aqui está o estado atual das suas partidas. A arena está no seu ritmo.</p>

          <section className="hero-panel" aria-label="Preparação para a live">
            <div className="hero-copy">
              <div className="eyebrow flex items-center gap-2"><Sparkles size={13} /> SEU PRÓXIMO AO VIVO</div>
              <h2>Uma comunidade pronta<br className="hidden sm:block" /> para entrar no jogo.</h2>
              <p>Este é o seu ponto de partida. Assim que criar uma partida, os números e a atividade da sua arena aparecem por aqui.</p>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="orbit" /><div className="arena-glyph"><Zap size={31} fill="currentColor" /></div></div>
          </section>

          <div className="section-head">
            <div><h2>Partidas em números</h2><p>Resumo geral da sua arena</p></div>
            <span className="font-mono text-[9px] text-[#6f7585]" data-testid="status-summary">DADOS ATUALIZADOS</span>
          </div>
          <section className="metric-grid" aria-label="Resumo de partidas">
            <MetricCard label="Total de partidas" value={totalMatches} detail="no total" icon={Layers3} color="#91edc2" testId="metric-total-matches" />
            <MetricCard label="Em andamento" value={activeMatches} detail="agora" icon={Activity} color="#f4a76c" testId="metric-active-matches" />
            <MetricCard label="Finalizadas" value={finishedMatches} detail="concluídas" icon={Check} color="#d99ad6" testId="metric-finished-matches" />
          </section>

          <section className="lower-grid">
            <article className="panel-card activity-card">
              <div className="flex items-start justify-between">
                <div><h2 className="panel-title">Atividade recente</h2><p className="panel-caption">O que está acontecendo na sua arena</p></div>
                <UsersRound size={16} className="text-[#737b8c]" />
              </div>
              <div className="empty-activity" data-testid="empty-recent-activity">
                <div className="empty-icon"><Activity size={17} /></div>
                <p><strong className="text-[#d5d8d4]">O feed ainda está vazio.</strong><br />Este resumo não traz atividade recente de partidas.</p>
              </div>
            </article>
            <article className="panel-card next-card">
              <h2 className="panel-title">Tudo começa aqui</h2>
              <p className="panel-caption">Seu espaço de preparação</p>
              <div className="next-step">
                <div className="step-number">01</div>
                <div>Explore a biblioteca e escolha o jogo que combina com a sua live.</div>
              </div>
            </article>
          </section>
          <div className="footer-note">BGL · CONTROLE DA SUA ARENA</div>
        </main>
      </div>
      {/* Slogan fixo no canto inferior */}
      <div className="fixed bottom-3 right-4 z-40 pointer-events-none select-none hidden sm:block">
        <img
          src="/brazas-slogan.png"
          alt="Brazas Gaming Lives"
          className="h-10 w-auto object-contain opacity-85 drop-shadow-[0_0_12px_rgba(0,180,216,0.65)]"
        />
      </div>
    </div>
  );
}

function GameShell({ children, pageTitle, active }: { children: ReactNode; pageTitle: string; active: 'games' | 'configure' }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const session = useGetAuthSession();
  const logout = useLogoutAdmin();

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: (authSession) => {
        queryClient.setQueryData(getGetAuthSessionQueryKey(), authSession);
        queryClient.removeQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setLocation('/login');
      },
    });
  };
  const username = session.data?.username || 'Administrador';
  return <div className="app-shell">
    <aside className="sidebar">
      <Brand />
      <div className="side-label">PAINEL</div>
      <nav aria-label="Navegação principal">
        <NavItem icon={BarChart3} href="/">Visão geral</NavItem>
        <NavItem icon={Gamepad2} href="/games" active={active === 'games' || active === 'configure'}>Biblioteca de jogos</NavItem>
        <NavItem icon={Swords} href="/play">Arena ao Vivo</NavItem>
        <NavItem icon={Radio} href="/games/batalha-de-votos/configure">Conexão TikTok LIVE</NavItem>
      </nav>
      <div className="sidebar-bottom">
        <div className="flex justify-center mb-2.5">
          <img
            src="/brazas-slogan.png"
            alt="Brazas Gaming Lives"
            className="h-8 w-auto object-contain opacity-85 drop-shadow-[0_0_10px_rgba(0,180,216,0.5)]"
          />
        </div>
        <div className="live-status"><div className="flex items-center gap-2"><span className="live-pulse" /><span className="text-[10px] font-bold text-[#e7e7df]">Central pronta</span></div><p className="mb-0 mt-2 text-[9px] leading-relaxed text-[#828998]">Prepare as regras antes de iniciar uma partida.</p></div>
        <button onClick={signOut} disabled={logout.isPending} className="nav-item mt-3 w-full border-0 bg-transparent text-left" data-testid="button-logout"><LogOut size={16} /><span>{logout.isPending ? 'Saindo…' : 'Sair da conta'}</span></button>
      </div>
    </aside>
      <div className="mobile-top"><Brand /><div className="mobile-actions"><Link href="/games" className="btn-quiet" data-testid="link-games-mobile">Jogos</Link><button onClick={signOut} disabled={logout.isPending} className="btn-quiet" data-testid="button-logout-mobile">{logout.isPending ? 'Saindo…' : 'Sair'}</button></div></div>
    <div className="main-area">
      <header className="topbar">
        <div className="top-breadcrumb"><Link href="/" className="breadcrumb-link">Painel</Link><span className="mx-2 text-[#555b69]">/</span><span className="text-[#c3c7cf]">{pageTitle}</span></div>
        <div className="top-user"><div className="text-right"><div className="text-[10px] font-bold text-[#dbded9]" data-testid="text-username">{username}</div><div className="mt-1 text-[8px] tracking-wide text-[#757b8b]">ADMINISTRADOR</div></div><div className="avatar-initial" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</div></div>
      </header>
      <main className="content-wrap game-content">
        {logout.isError && <p className="form-error mb-4" role="alert" data-testid="status-logout-error">Não foi possível encerrar a sessão. Tente novamente.</p>}
        {children}
      </main>
    </div>
    {/* Slogan fixo no canto inferior */}
    <div className="fixed bottom-3 right-4 z-40 pointer-events-none select-none hidden sm:block">
      <img
        src="/brazas-slogan.png"
        alt="Brazas Gaming Lives"
        className="h-10 w-auto object-contain opacity-85 drop-shadow-[0_0_12px_rgba(0,180,216,0.65)]"
      />
    </div>
  </div>;
}

function GamesLibrary() {
  return <GameShell pageTitle="Biblioteca de jogos" active="games">
    <div className="eyebrow">MODO OFICIAL DISPONÍVEL</div>
    <div className="library-heading">
      <div><h1 className="page-title" data-testid="heading-game-library">Biblioteca de Jogos BGL</h1><p className="page-subtitle">Pronto para rodar na sua Live do TikTok ou no modo simulado para teste.</p></div>
      <span className="library-count" data-testid="text-library-count">PRONTO PARA USAR</span>
    </div>
    <section className="available-games" aria-label="Jogos disponíveis">
      {availableGames.map((game, index) => {
        const manifest = game.plugin.manifest;
        return <article className="featured-game" key={game.id} data-testid={`card-game-${game.id}`}>
          <div className="featured-art" style={{ background: manifest.thumbnail }}><span className="featured-ring" /><div className="featured-emblem"><Swords size={38} /></div><span className="featured-tag">ELEIÇÃO AO VIVO</span></div>
          <div className="featured-copy">
            <span className="game-version">BGL ORIGINAL · VERSÃO 1.0 COMPLETA</span>
            <h2>{manifest.name}</h2>
            <p>Dois candidatos, urna eletrônica com apuração em tempo real, votação por presentes do TikTok ou simulador integrado.</p>
            <div className="game-meta">
              <span>Urna Eletrônica</span>
              <span>TikTok LIVE</span>
              <span>Modo Simulação</span>
              <span>Votos em Dobro</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <Link href="/play" className="game-create-button !bg-[#00d2ff] !text-[#040914] font-black shadow-[0_0_20px_rgba(0,210,255,0.4)]" data-testid="button-play-direct">
                ▶ Jogar Agora (Arena Pronta)
              </Link>
              <Link href={`/games/${game.id}/configure`} className="btn-quiet !py-2.5 !px-4 text-xs font-bold inline-flex items-center gap-1.5" data-testid={`button-create-match-${game.id}`}>
                ⚙ Personalizar Candidatos & Presentes
              </Link>
            </div>
          </div>
          <div className="feature-index">{String(index + 1).padStart(2, '0')}</div>
        </article>;
      })}
    </section>
    <div className="footer-note">BGL · SISTEMA OPERACIONAL DA SUA LIVE</div>
  </GameShell>;
}

function ConfigureGame() {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const game = findAvailableGame(gameId);
  const GameConfig = game?.plugin.ConfigForm;
  const name = game?.plugin.manifest.name || 'Jogo não encontrado';
  return <GameShell pageTitle={name} active="configure">
    <div className="configure-topline"><Link href="/games" className="text-link" data-testid="link-config-back"><ArrowLeft size={14} /> Voltar à biblioteca</Link><span className="setup-badge"><span /> CONFIGURAÇÃO LOCAL</span></div>
    {game && GameConfig ? <>
      <div className="configure-heading">
        <div><div className="eyebrow">MÓDULO DE JOGO <span className="heading-divider">/</span> CONFIGURAÇÃO</div><h1 className="page-title" data-testid="heading-configure">{name}</h1><p className="page-subtitle">Defina as regras do módulo antes de iniciar sua live.</p></div>
        <div className="config-progress" aria-label="Marco 1 de 7"><span>MARCO</span><strong>01</strong><i>de 07</i></div>
      </div>
      <div className="config-notice" data-testid="status-config-scope"><Info size={15} /><span>Esta etapa valida regras e arquivos localmente. Ela não cria nem salva partidas.</span></div>
      <GameConfig />
    </> : <section className="game-scaffold" role="status" data-testid="status-game-not-found"><div className="eyebrow">MÓDULO INDISPONÍVEL</div><h2>Este jogo não está disponível para configuração.</h2><p>Escolha um módulo ativo na biblioteca.</p><Link href="/games" className="text-link">Voltar à biblioteca</Link></section>}
  </GameShell>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/games" component={GamesLibrary} />
        <Route path="/games/:gameId/configure" component={ConfigureGame} />
        <Route path="/play/:matchId" component={PlayGame} />
        <Route path="/play" component={PlayGame} />
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
