import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useMobileStore = create(
  immer((set) => ({
    // State
    gameState: 'WAITING', // WAITING, CINEMATIC, TUTORIAL, CASTING, PLAYING, FINISHED
    // 최종 점수 (게임 종료 시 수신, ResultView용)
    finalScore: {
      A: 0,
      B: 0,
      winnerTeam: null,
      mvp: null,
    },
    myTeam: null, // 'A' | 'B'
    playerId: null,
    nickname: '',
    profileImage: null, // User profile image URL
    isTeamLeader: false,
    isConnected: false,
    token: null,
    roomId: null,
    pendingRoomCode: null, // For flow: Login -> Profile -> Join
    players: [],
    // CASTING phase shared state
    castingCountdown: null, // 서버 캐스팅 카운트다운 (5~1)
    isCastingStarted: false, // 서버에서 casting_start 수신 여부
    // 캐스팅 시 사용되는 peak power (5초 후 첫 shake)
    castingPower: 0,

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

    setProfileImage: (url) =>
      set((draft) => {
        draft.profileImage = url;
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

    setPendingRoomCode: (code) =>
      set((draft) => {
        draft.pendingRoomCode = code;
      }),

    // 최종 점수 설정 (게임 종료 시)
    setFinalScore: (scoreData) =>
      set((draft) => {
        draft.finalScore = { ...scoreData };
      }),

    setConnected: (connected) =>
      set((draft) => {
        draft.isConnected = connected;
      }),

    setCastingCountdown: (count) =>
      set((draft) => {
        draft.castingCountdown = count;
      }),

    setIsCastingStarted: (started) =>
      set((draft) => {
        draft.isCastingStarted = started;
      }),
  }))
);
