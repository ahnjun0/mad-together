import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useMobileStore = create(
  immer((set) => ({
    // State
    gameState: 'WAITING', // 'WAITING' | 'TUTORIAL' | 'PLAYING' | 'FINISHED'
    score: {
      A: 0,
      B: 0,
    },
    myTeam: null, // null | 'A' | 'B'
    isConnected: false,

    // Actions
    setGameState: (state) =>
      set((draft) => {
        draft.gameState = state;
      }),

    setTeam: (team) =>
      set((draft) => {
        draft.myTeam = team;
      }),

    updateScore: (teamScores) =>
      set((draft) => {
        draft.score = { ...teamScores };
      }),

    setConnected: (connected) =>
      set((draft) => {
        draft.isConnected = connected;
      }),
  }))
);
