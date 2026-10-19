import type { ComponentType } from 'react';
import type { ZodTypeAny } from 'zod';
import * as batalhaDeVotos from './batalha-de-votos';

type GameModule = {
  manifest: { id: string; name: string; description: string; category: string; thumbnail: string; formats: readonly string[]; version: string };
  configSchema: ZodTypeAny;
  ConfigForm: ComponentType;
  GameScreen: ComponentType;
  reducer: (...args: any[]) => unknown;
};

type AvailableGameEntry = {
  available: true;
  id: string;
  plugin: GameModule;
};

type FutureGameEntry = {
  available: false;
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
};

export const gameRegistry = [
  { id: batalhaDeVotos.manifest.id, available: true, plugin: batalhaDeVotos },
  { id: 'duelo-relampago', name: 'Duelo Relâmpago', description: 'Desafios rápidos para movimentar o chat.', category: 'Desafio', available: false, thumbnail: 'linear-gradient(135deg, #333047, #b67892)' },
  { id: 'roleta-da-live', name: 'Roleta da Live', description: 'Surpresas para a comunidade escolher em conjunto.', category: 'Comunidade', available: false, thumbnail: 'linear-gradient(135deg, #263b45, #dfab63)' },
] as const satisfies readonly (AvailableGameEntry | FutureGameEntry)[];

export type RegisteredGame = typeof gameRegistry[number];
export type AvailableGame = Extract<RegisteredGame, { available: true }>;
export type FutureGame = Extract<RegisteredGame, { available: false }>;

export const availableGames: AvailableGame[] = gameRegistry.filter((entry): entry is AvailableGame => entry.available);
export const futureGames: FutureGame[] = gameRegistry.filter((entry): entry is FutureGame => !entry.available);

export function findAvailableGame(gameId: string): AvailableGame | undefined {
  return availableGames.find((entry) => entry.id === gameId);
}
