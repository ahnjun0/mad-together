import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useMobileStore = create(
  immer((set) => ({
    // State
    gameState: 'WAITING', // WAITING, CINEMATIC, TUTORIAL, CASTING, PLAYING, FINISHED
    score: {
      A: 0,
      B: 0,
    },
    myTeam: null, // 'A' | 'B'
    playerId: null,
    nickname: '',
    isTeamLeader: false,
    isConnected: false,
    token: null,
    roomId: null,
    players: [],

    // Actions
    setGameState: (state) =>
      set((draft) => {
        draft.gameState = state;
      }),

    setTeam: (team) =>
      set((draft) => {
        draft.myTeam = team;
      }),

    setPlayers: (players) =>
      set((draft) => {
        draft.players = players;
      }),

    setPlayerId: (id) =>
      set((draft) => {
        draft.playerId = id;
      }),

    setNickname: (name) =>
      set((draft) => {
        draft.nickname = name;
      }),

    setIsTeamLeader: (isLeader) =>
      set((draft) => {
        draft.isTeamLeader = isLeader;
      }),

    setToken: (token) =>
      set((draft) => {
        draft.token = token;
      }),

    setRoomId: (id) =>
      set((draft) => {
        draft.roomId = id;
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
