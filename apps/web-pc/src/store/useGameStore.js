import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Zustand store for the game
// This store is used to manage the game state and the score
export const useGameStore = create(
  immer((set) => ({
    // State
    gameState: 'WAITING', // 'WAITING' | 'TUTORIAL' | 'CASTING' | 'PLAYING' | 'FINISHED'
    score: {
      A: 0,
      B: 0,
    },
    myTeam: null, // null | 'A' | 'B'
    isHost: false,
    players: {
      A: [],
      B: [],
    },

    // Actions
    setGameState: (state) =>
      set((draft) => {
        draft.gameState = state;
      }),

    updateScore: (team, amount) =>
      set((draft) => {
        if (draft.score[team] !== undefined) {
          draft.score[team] += amount;
        }
      }),

    setTeam: (team) =>
      set((draft) => {
        draft.myTeam = team;
      }),

    toggleHost: () =>
      set((draft) => {
        draft.isHost = !draft.isHost;
      }),

    resetScore: () =>
      set((draft) => {
        draft.score = { A: 0, B: 0 };
      }),
  }))
);
