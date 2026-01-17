import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Zustand store for the game
// This store is used to manage the game state and the score
export const useGameStore = create(
  immer((set) => ({
    // State
    gameState: 'HOME', // 'HOME' | 'WAITING' | 'TUTORIAL' | 'CASTING' | 'PLAYING' | 'FINISHED'
    score: {
      A: 0,
      B: 0,
    },
    myTeam: null, // null | 'A' | 'B'
    isHost: false,
    isConnected: false,
    roomInfo: {
      roomId: null,
      code: null,
      qrCode: null,
      teamAName: 'A팀',
      teamBName: 'B팀',
      maxPlayers: 10,
      status: null,
    },
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

    // DevTools actions for testing
    addMockPlayer: (team, player) =>
      set((draft) => {
        if (draft.players[team]) {
          draft.players[team].push(player);
        }
      }),

    toggleReadyAll: () =>
      set((draft) => {
        ['A', 'B'].forEach((team) => {
          if (draft.players[team]) {
            draft.players[team].forEach((player) => {
              player.isReady = true;
            });
          }
        });
      }),

    clearPlayers: () =>
      set((draft) => {
        draft.players = { A: [], B: [] };
      }),

    setScore: (teamScores) =>
      set((draft) => {
        draft.score = { ...teamScores };
      }),

    // Socket & Room actions
    setRoomInfo: (info) =>
      set((draft) => {
        draft.roomInfo = { ...draft.roomInfo, ...info };
      }),

    setConnected: (connected) =>
      set((draft) => {
        draft.isConnected = connected;
      }),

    updatePlayers: (playersData) =>
      set((draft) => {
        // If playersData is a function (for complex updates), call it
        if (typeof playersData === 'function') {
          const currentPlayers = { A: [...draft.players.A], B: [...draft.players.B] };
          const updated = playersData(currentPlayers);
          draft.players = updated || currentPlayers;
        } else if (Array.isArray(playersData)) {
          // If it's an array, reorganize by team
          draft.players = {
            A: playersData.filter((p) => p.team === 'A'),
            B: playersData.filter((p) => p.team === 'B'),
          };
        }
      }),

    setHost: (isHost) =>
      set((draft) => {
        draft.isHost = isHost;
      }),
  }))
);
