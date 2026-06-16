// Markov chain data types + answer-key normalization. Kept in a tiny dependency-
// free module (no React, no canvas) so consumers that only need the types or
// normalizeChain — e.g. the contest page's save/dirty logic — don't pull the
// heavy MarkovEditor component (and its bundle) into their chunk.

export interface MarkovState {
  id: string; // "q0", "q1", …
  x: number;
  y: number;
  isInitial: boolean;
  isAccepting: boolean;
}

export interface MarkovTransition {
  id: string;
  from: string;
  to: string;
  probability: string; // "0.5" or "1/3"
}

export interface MarkovChain {
  states: MarkovState[];
  transitions: MarkovTransition[];
}

/** Strip layout (x/y) so the persisted answer key is position-independent. */
export function normalizeChain(chain: MarkovChain): { states: Omit<MarkovState, "x" | "y">[]; transitions: MarkovTransition[] } {
  return {
    states: chain.states.map(({ id, isInitial, isAccepting }) => ({ id, isInitial, isAccepting })),
    transitions: chain.transitions,
  };
}
