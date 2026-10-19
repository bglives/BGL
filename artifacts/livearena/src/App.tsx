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
  ArrowRight,
  BarChart3,
  Check,
  CircleHelp,
  Eye,
  EyeOff,
  Gamepad2,
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
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-livearena">
      <div className="brand-mark"><Swords size={18} strokeWidth={2.2} /></div>
      {!compact && <div className="brand-word">live<span>arena</span></div>}
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
        <p>Houve uma falha ao conectar com o LiveArena. Tente novamente em instantes.</p>
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (session.data?.authenticated) setLocation('/');
  }, [session.data?.authenticated, setLocation]);

  if (session.isLoading) return <LoadingScreen />;
  if (session.isError) return <QueryError title="Não foi possível verificar o acesso" onRetry={() => void session.refetch()} />;
  if (session.data?.authenticated) return <LoadingScreen />;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError('');
    if (!username.trim() || !password) {
      setValidationError('Informe seu usuário e sua senha para continuar.');
      return;
    }
    login.mutate(
      { data: { username: username.trim(), password } },
      {
        onSuccess: (authSession) => {
          queryClient.setQueryData(getGetAuthSessionQueryKey(), authSession);
          void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          if (authSession.authenticated) setLocation('/');
          else setValidationError('Acesso não autorizado. Confira seus dados e tente novamente.');
        },
        onError: () => setValidationError('Não foi possível entrar. Confira seus dados e tente novamente.'),
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
            <span className="rounded-full border border-[#343b42] px-2.5 py-1 text-[9px] font-bold tracking-[.12em] text-[#9299a7]">ADMIN</span>
          </div>
          <h2>Entrar no painel</h2>
          <p className="intro">Acesse sua central para deixar tudo pronto para a próxima live.</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="field-block">
              <label className="form-label" htmlFor="admin-username">Usuário</label>
              <input
                id="admin-username"
                className="form-input"
                autoComplete="username"
                placeholder="Seu usuário de administrador"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={login.isPending}
                data-testid="input-username"
              />
            </div>
            <div className="field-block">
              <label className="form-label" htmlFor="admin-password">Senha</label>
              <div className="password-wrap">
                <input
                  id="admin-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={login.isPending}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="show-password"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {validationError && <p className="form-error" role="alert" data-testid="status-login-error">{validationError}</p>}
            <button type="submit" className="submit-button" disabled={login.isPending} data-testid="button-login">
              {login.isPending ? <>Validando acesso… <RotateCw size={14} className="animate-spin" /></> : <>Entrar com segurança <ArrowRight size={15} /></>}
            </button>
          </form>
          <p className="security-note flex items-center justify-center gap-2"><ShieldCheck size={13} /> Acesso restrito ao administrador da live</p>
        </div>
      </section>
    </main>
  );
}

function NavItem({ icon: Icon, children, active = false }: { icon: typeof Activity; children: ReactNode; active?: boolean }) {
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
    query: { enabled: !!session.data?.authenticated, queryKey: getGetDashboardSummaryQueryKey() },
  });
  const logout = useLogoutAdmin();

  useEffect(() => {
    if (!session.isLoading && !session.isError && !session.data?.authenticated) setLocation('/login');
  }, [session.isLoading, session.isError, session.data?.authenticated, setLocation]);

  if (session.isLoading) return <LoadingScreen />;
  if (session.isError) return <QueryError title="Não foi possível verificar o acesso" onRetry={() => void session.refetch()} />;
  if (!session.data?.authenticated) return <LoadingScreen />;
  if (summary.isLoading) return <LoadingScreen />;
  if (summary.isError) return <QueryError onRetry={() => void summary.refetch()} />;
  if (!summary.data) return <LoadingScreen />;

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: (authSession) => {
        queryClient.setQueryData(getGetAuthSessionQueryKey(), authSession);
        queryClient.removeQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setLocation('/login');
      },
    });
  };
  const username = session.data.username || 'Administrador';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="side-label">PAINEL</div>
        <nav aria-label="Navegação principal">
          <NavItem icon={BarChart3} active>Visão geral</NavItem>
          <NavItem icon={Gamepad2}>Biblioteca de jogos</NavItem>
          <NavItem icon={Swords}>Partidas</NavItem>
          <NavItem icon={Radio}>Conexão TikTok LIVE</NavItem>
        </nav>
        <div className="sidebar-bottom">
          <div className="live-status">
            <div className="flex items-center gap-2"><span className="live-pulse" /><span className="text-[10px] font-bold text-[#e7e7df]">Central pronta</span></div>
            <p className="mb-0 mt-2 text-[9px] leading-relaxed text-[#828998]">Sua próxima transmissão começa com uma boa preparação.</p>
          </div>
          <button onClick={signOut} disabled={logout.isPending} className="nav-item mt-3 w-full border-0 bg-transparent text-left" data-testid="button-logout">
            <LogOut size={16} /><span>{logout.isPending ? 'Saindo…' : 'Sair da conta'}</span>
          </button>
        </div>
      </aside>
      <div className="mobile-top"><Brand /><button onClick={signOut} disabled={logout.isPending} className="btn-quiet" data-testid="button-logout-mobile">{logout.isPending ? 'Saindo…' : 'Sair'}</button></div>
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
            <MetricCard label="Total de partidas" value={summary.data.totalMatches} detail="no total" icon={Layers3} color="#91edc2" testId="metric-total-matches" />
            <MetricCard label="Em andamento" value={summary.data.activeMatches} detail="agora" icon={Activity} color="#f4a76c" testId="metric-active-matches" />
            <MetricCard label="Finalizadas" value={summary.data.finishedMatches} detail="concluídas" icon={Check} color="#d99ad6" testId="metric-finished-matches" />
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
          <div className="footer-note">LIVEARENA · CONTROLE DA SUA ARENA</div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login" component={Login} />
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
