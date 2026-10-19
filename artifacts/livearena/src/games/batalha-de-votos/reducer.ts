import type { BatalhaDeVotosConfig } from './config-schema';

// Marco 1: reducer puro de identidade, sem pontuação ou mecânicas ativas.
// A implementação das regras fica reservada aos próximos marcos.
export type BatalhaState = { phase: 'aguardando'; scoreA: number; scoreB: number };
export type BatalhaEvent = { type: 'NOOP' };

export function reducer(_state: BatalhaState, _event: BatalhaEvent, _config: BatalhaDeVotosConfig): BatalhaState {
  return _state;
}
