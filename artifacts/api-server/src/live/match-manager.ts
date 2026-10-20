import fs from 'node:fs';
import path from 'node:path';
import type { BatalhaReducerConfig } from '@workspace/game-engine';
import { logger } from '../lib/logger';
import { MatchSession } from './match-session';

export type StoredMatch = {
  id: string;
  gameId: string;
  title: string;
  status: 'draft' | 'ready' | 'live' | 'finished';
  tiktokUsername: string;
  isSimulation: boolean;
  config: BatalhaReducerConfig;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
};

export class MatchManager {
  private static instance: MatchManager | null = null;

  public static getInstance(): MatchManager {
    if (!MatchManager.instance) {
      MatchManager.instance = new MatchManager();
    }
    return MatchManager.instance;
  }

  private readonly activeSessions = new Map<string, MatchSession>();
  private readonly matches = new Map<string, StoredMatch>();
  private readonly storageFilePath: string;

  constructor() {
    const dataDir = path.resolve(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        logger.warn({ err }, 'Não foi possível criar diretório .data');
      }
    }
    this.storageFilePath = path.resolve(dataDir, 'matches.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (!fs.existsSync(this.storageFilePath)) return;
    try {
      const content = fs.readFileSync(this.storageFilePath, 'utf-8');
      const parsed: StoredMatch[] = JSON.parse(content);
      for (const match of parsed) {
        this.matches.set(match.id, match);
      }
      logger.info({ count: this.matches.size }, 'Partidas carregadas do armazenamento local');
    } catch (err) {
      logger.error({ err }, 'Erro ao carregar partidas do disco');
    }
  }

  private saveToDisk(): void {
    try {
      const data = Array.from(this.matches.values());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.error({ err }, 'Erro ao salvar partidas no disco');
    }
  }

  public createMatch(params: {
    title?: string;
    config: BatalhaReducerConfig;
    tiktokUsername?: string;
    isSimulation?: boolean;
  }): StoredMatch {
    const id = `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const stored: StoredMatch = {
      id,
      gameId: 'batalha-de-votos',
      title: params.title || 'Batalha de Votos',
      status: 'ready',
      tiktokUsername: (params.tiktokUsername || '').replace(/^@/, ''),
      isSimulation: Boolean(params.isSimulation),
      config: params.config,
      createdAt: new Date().toISOString(),
    };

    this.matches.set(id, stored);
    this.saveToDisk();
    return stored;
  }

  public getStoredMatch(id: string): StoredMatch | undefined {
    return this.matches.get(id);
  }

  public listStoredMatches(): StoredMatch[] {
    return Array.from(this.matches.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public getSession(id: string): MatchSession | undefined {
    return this.activeSessions.get(id);
  }

  public async startMatch(id: string): Promise<MatchSession> {
    const stored = this.matches.get(id);
    if (!stored) {
      throw new Error(`Partida com id ${id} não encontrada.`);
    }

    let session = this.activeSessions.get(id);
    if (!session) {
      session = new MatchSession({
        id,
        config: stored.config,
        tiktokUsername: stored.tiktokUsername,
        isSimulation: stored.isSimulation,
      });
      this.activeSessions.set(id, session);
    }

    stored.status = 'live';
    stored.startedAt = new Date().toISOString();
    this.saveToDisk();

    await session.start();
    return session;
  }

  public async stopMatch(id: string): Promise<void> {
    const session = this.activeSessions.get(id);
    if (session) {
      await session.stop();
      this.activeSessions.delete(id);
    }

    const stored = this.matches.get(id);
    if (stored) {
      stored.status = 'finished';
      stored.endedAt = new Date().toISOString();
      this.saveToDisk();
    }
  }
}
