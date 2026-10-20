class ElectionSoundEffects {
  private audioCtx: AudioContext | null = null;
  private isMuted = false;
  private masterVolume = 0.7;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public setVolume(volume0to100: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume0to100 / 100));
  }

  /**
   * Sintetiza o autêntico "Pirilili" de confirmação de voto da Urna Eletrônica brasileira
   */
  public playUrnaBeep(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';

      // Sequência de 3 tons característicos da confirmação da urna eletrônica
      osc.frequency.setValueAtTime(440, now); // Tom 1 (Lá 440Hz)
      osc.frequency.setValueAtTime(659.25, now + 0.08); // Tom 2 (Mi 659Hz)
      osc.frequency.setValueAtTime(1046.5, now + 0.16); // Tom 3 (Dó agudo 1046Hz)

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.4 * this.masterVolume, now + 0.02);
      gain.gain.setValueAtTime(0.4 * this.masterVolume, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.42);
    } catch {
      // Ignora restrições de autoplay até interação do usuário
    }
  }

  /**
   * Vinheta de Plantão Urgente / Virada Eleitoral
   */
  public playPlantaoAlert(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Dois tons rápidos e impactantes de sirene/alerta
      for (let i = 0; i < 3; i++) {
        const start = now + i * 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(740, start);
        osc.frequency.setValueAtTime(587, start + 0.08);

        gain.gain.setValueAtTime(0.3 * this.masterVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.16);
      }
    } catch {}
  }

  /**
   * Fanfarra triunfante para presentes épicos e vitória
   */
  public playFanfare(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const start = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25 * this.masterVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + (idx === 3 ? 0.6 : 0.25));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + (idx === 3 ? 0.6 : 0.25));
      });
    } catch {}
  }
}

export const electionSound = new ElectionSoundEffects();
