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
    // 팀 이름 (서버에서 수신)
    teamAName: 'A팀',
    teamBName: 'B팀',
    // CASTING phase shared state
    castingCountdown: null, // 서버 캐스팅 카운트다운 (5~1)
    isCastingStarted: false, // 서버에서 casting_start 수신 여부

    // Kick 모달 상태
    kickModal: {
      isOpen: false,
      message: '',
    },

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

    setTeamNames: (teamAName, teamBName) =>
      set((draft) => {
        draft.teamAName = teamAName || 'A팀';
        draft.teamBName = teamBName || 'B팀';
      }),

    // Kick 모달 열기
    showKickModal: (message) =>
      set((draft) => {
        draft.kickModal = {
          isOpen: true,
          message: message || '호스트에 의해 방에서 퇴장되었습니다.',
        };
      }),

    // Kick 모달 닫기 및 상태 초기화 (로그인 화면으로 이동)
    closeKickModalAndReset: () =>
      set((draft) => {
        // 모달 닫기
        draft.kickModal = { isOpen: false, message: '' };
        // 방 관련 상태 초기화 (token은 유지하여 다시 로그인 불필요)
        draft.gameState = 'WAITING';
        draft.roomId = null;
        draft.playerId = null;
        draft.myTeam = null;
        draft.isTeamLeader = false;
        draft.players = [];
        draft.teamAName = 'A팀';
        draft.teamBName = 'B팀';
        draft.finalScore = { A: 0, B: 0, winnerTeam: null, mvp: null };
        draft.castingCountdown = null;
        draft.isCastingStarted = false;
      }),
  }))
);
