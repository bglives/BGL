import { Swords } from 'lucide-react';

export function GameScreen() {
  return (
    <section className="game-scaffold" data-testid="status-game-screen-scaffold">
      <div className="game-scaffold-mark"><Swords size={23} /></div>
      <span className="eyebrow">MÓDULO BATALHA DE VOTOS</span>
      <h2>A tela da partida chega no próximo marco.</h2>
      <p>Aqui ficará a arena ao vivo. Pontuação, eventos e integração de transmissão ainda não estão ativos.</p>
    </section>
  );
}
