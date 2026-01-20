import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Zustand store for the game
// This store is used to manage the game state and the score
export const useGameStore = create(
  immer((set) => ({
    // Auth State
    isAuthenticated: false,
    accessToken: null,
    user: {
      id: null,
      nickname: null,
      profileImage: null,
    },

    // Game State
    gameState: 'LOGIN', // 'LOGIN' | 'HOME' | 'WAITING' | 'CINEMATIC' | 'TUTORIAL' | 'CASTING' | 'PLAYING' | 'FINISHED'
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
    hostDevToken: null, // 호스트 개발 모드 토큰 (deprecated - use accessToken)
    players: {
      A: [],
      B: [],
      unassigned: [], // 팀이 할당되지 않은 플레이어
    },

    // Shake tracking for fishing rod animation
    shakeHistory: {
      A: [], // Array of timestamps (ms)
      B: [],
    },
    // Time window for calculating shake intensity (ms)
    SHAKE_WINDOW_MS: 2000,
    // Max shakes per second for normalization
    MAX_SHAKES_PER_SECOND: 10,

    // Casting phase state
    castingCountdown: null, // 서버 캐스팅 카운트다운 (5~1)
    isCastingStarted: false, // 서버에서 casting_start 수신 여부
    castingPower: {
      A: null,
      B: null,
    },

    // Alert/Toast state
    alert: null, // { type: 'error' | 'warning' | 'info', message: string, details?: object }

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

    // Shake tracking actions
    addShakeEvent: (team) =>
      set((draft) => {
        if (!draft.shakeHistory[team]) return;
        const now = Date.now();
        draft.shakeHistory[team].push(now);
        // Clean up old events outside the window
        const cutoff = now - draft.SHAKE_WINDOW_MS;
        draft.shakeHistory[team] = draft.shakeHistory[team].filter(
          (t) => t >= cutoff
        );
      }),

    clearShakeHistory: () =>
      set((draft) => {
        draft.shakeHistory = { A: [], B: [] };
      }),

    setCastingCountdown: (count) =>
      set((draft) => {
        draft.castingCountdown = count;
      }),

    setCastingStarted: (started) =>
      set((draft) => {
        draft.isCastingStarted = started;
      }),

    setCastingPower: (team, power) =>
      set((draft) => {
        if (!draft.castingPower[team]) {
          // allow only A/B keys
        }
        draft.castingPower[team] = power;
      }),

    // Alert actions
    showAlert: (type, message, details = null) =>
      set((draft) => {
        draft.alert = { type, message, details };
      }),

    clearAlert: () =>
      set((draft) => {
        draft.alert = null;
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
        draft.players = { A: [], B: [], unassigned: [] };
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

    // Set players (replace entire array - used in room_state)
    setPlayers: (playersArray) =>
      set((draft) => {
        if (!Array.isArray(playersArray)) return;
        
        // Normalize player data: ensure id and nickname exist
        const normalized = playersArray.map((p) => ({
          id: p.id || p.playerId,
          playerId: p.playerId || p.id,
          nickname: p.nickname || 'Unknown',
          team: p.team || null,
          isHost: p.isHost || false,
          isReady: p.isReady || false,
          isLeader: p.isLeader || false,
          sensorChecked: p.sensorChecked || false,
          score: p.score || 0,
          ...p, // Keep other properties
        }));
        
        // Reorganize by team
        draft.players = {
          A: normalized.filter((p) => p.team === 'A'),
          B: normalized.filter((p) => p.team === 'B'),
          unassigned: normalized.filter((p) => !p.team || p.team === null),
        };
      }),

    // Add player (append to array - duplicate check)
    addPlayer: (player) =>
      set((draft) => {
        const playerId = player.id || player.playerId;
        if (!playerId) return;
        
        // Normalize player data
        const normalized = {
          id: playerId,
          playerId: playerId,
          nickname: player.nickname || 'Unknown',
          team: player.team || null,
          isHost: player.isHost || false,
          isReady: player.isReady || false,
          isLeader: player.isLeader || false,
          sensorChecked: player.sensorChecked || false,
          score: player.score || 0,
          ...player,
        };
        
        // Check for duplicates
        const allPlayers = [...draft.players.A, ...draft.players.B, ...draft.players.unassigned];
        if (allPlayers.some((p) => (p.id || p.playerId) === playerId)) {
          console.warn('[Store] Player already exists:', playerId);
          return;
        }
        
        // Add to appropriate team
        if (normalized.team === 'A') {
          draft.players.A.push(normalized);
        } else if (normalized.team === 'B') {
          draft.players.B.push(normalized);
        } else {
          draft.players.unassigned.push(normalized);
        }
      }),

    // Update player (find by ID and merge)
    updatePlayer: (playerId, updates) =>
      set((draft) => {
        // Find player in current teams
        let currentTeam = null;
        let playerIndex = -1;
        
        // Check Team A
        playerIndex = draft.players.A.findIndex((p) => (p.id || p.playerId) === playerId);
        if (playerIndex !== -1) {
          currentTeam = 'A';
        } else {
          // Check Team B
          playerIndex = draft.players.B.findIndex((p) => (p.id || p.playerId) === playerId);
          if (playerIndex !== -1) {
            currentTeam = 'B';
          } else {
            // Check Unassigned
            playerIndex = draft.players.unassigned.findIndex((p) => (p.id || p.playerId) === playerId);
            if (playerIndex !== -1) {
              currentTeam = 'unassigned';
            }
          }
        }
        
        if (currentTeam === null || playerIndex === -1) {
          // console.warn('[Store] Player not found for update:', playerId);
          return;
        }
        
        const player = draft.players[currentTeam][playerIndex];
        const updatedPlayer = { ...player, ...updates };
        
        // Check if team changed
        const newTeam = updatedPlayer.team === 'A' ? 'A' : updatedPlayer.team === 'B' ? 'B' : 'unassigned';
        
        if (currentTeam === newTeam) {
          // Update in place
          draft.players[currentTeam][playerIndex] = updatedPlayer;
        } else {
          // Move to new team
          draft.players[currentTeam].splice(playerIndex, 1);
          draft.players[newTeam].push(updatedPlayer);
        }
      }),

    // Remove player (filter out by ID)
    removePlayer: (playerId) =>
      set((draft) => {
        draft.players.A = draft.players.A.filter((p) => (p.id || p.playerId) !== playerId);
        draft.players.B = draft.players.B.filter((p) => (p.id || p.playerId) !== playerId);
        draft.players.unassigned = draft.players.unassigned.filter((p) => (p.id || p.playerId) !== playerId);
      }),

    // Legacy updatePlayers (for backward compatibility)
    updatePlayers: (playersData) =>
      set((draft) => {
        // If playersData is a function (for complex updates), call it
        if (typeof playersData === 'function') {
          const currentPlayers = { 
            A: [...draft.players.A], 
            B: [...draft.players.B],
            unassigned: [...draft.players.unassigned],
          };
          const updated = playersData(currentPlayers);
          draft.players = updated || currentPlayers;
        } else if (Array.isArray(playersData)) {
          // If it's an array, use setPlayers logic
          const normalized = playersData.map((p) => ({
            id: p.id || p.playerId,
            playerId: p.playerId || p.id,
            nickname: p.nickname || 'Unknown',
            team: p.team || null,
            isHost: p.isHost || false,
            isReady: p.isReady || false,
            isLeader: p.isLeader || false,
            sensorChecked: p.sensorChecked || false,
            score: p.score || 0,
            ...p,
          }));
          
          draft.players = {
            A: normalized.filter((p) => p.team === 'A'),
            B: normalized.filter((p) => p.team === 'B'),
            unassigned: normalized.filter((p) => !p.team || p.team === null),
          };
        }
      }),

    setHost: (isHost) =>
      set((draft) => {
        draft.isHost = isHost;
      }),

    setHostDevToken: (token) =>
      set((draft) => {
        draft.hostDevToken = token;
      }),

    // Auth actions
    setAuth: (accessToken, user) =>
      set((draft) => {
        draft.isAuthenticated = true;
        draft.accessToken = accessToken;
        draft.user = {
          id: user.id,
          nickname: user.nickname || user.googleName,
          profileImage: user.profileImage,
        };
        draft.hostDevToken = accessToken; // 호환성 유지
      }),

    logout: () =>
      set((draft) => {
        draft.isAuthenticated = false;
        draft.accessToken = null;
        draft.user = { id: null, nickname: null, profileImage: null };
        draft.hostDevToken = null;
        draft.gameState = 'LOGIN';
        draft.roomInfo = {
          roomId: null,
          code: null,
          qrCode: null,
          teamAName: 'A팀',
          teamBName: 'B팀',
          maxPlayers: 10,
          status: null,
        };
        draft.players = { A: [], B: [], unassigned: [] };
      }),

    // 기존 게임으로 복귀
    restoreRoom: (roomData) =>
      set((draft) => {
        draft.roomInfo = {
          roomId: roomData.roomId,
          code: roomData.code,
          qrCode: roomData.qrCode,
          teamAName: roomData.teamAName,
          teamBName: roomData.teamBName,
          maxPlayers: roomData.maxPlayers || 10,
          status: roomData.status,
        };
        draft.isHost = true;
        // 상태에 따라 gameState 설정
        const statusMap = {
          WAITING: 'WAITING',
          CINEMATIC: 'CINEMATIC',
          TUTORIAL: 'TUTORIAL',
          CASTING: 'CASTING',
          PLAYING: 'PLAYING',
          FINISHED: 'FINISHED',
        };
        draft.gameState = statusMap[roomData.status] || 'WAITING';
      }),
  }))
);

// Selector for calculating shake intensity (0-1)
// Returns a value between 0 and 1 based on recent shake frequency
export const getShakeIntensity = (state, team) => {
  const history = state.shakeHistory[team];
  if (!history || history.length === 0) return 0;

  const now = Date.now();
  const cutoff = now - state.SHAKE_WINDOW_MS;
  const recentShakes = history.filter((t) => t >= cutoff);

  // Calculate shakes per second
  const shakesPerSecond = recentShakes.length / (state.SHAKE_WINDOW_MS / 1000);

  // Normalize to 0-1 range
  return Math.min(shakesPerSecond / state.MAX_SHAKES_PER_SECOND, 1);
};

// Hook for using shake intensity with auto-update
export const useShakeIntensity = (team) => {
  const shakeHistory = useGameStore((state) => state.shakeHistory[team]);
  const SHAKE_WINDOW_MS = useGameStore((state) => state.SHAKE_WINDOW_MS);
  const MAX_SHAKES_PER_SECOND = useGameStore((state) => state.MAX_SHAKES_PER_SECOND);

  const now = Date.now();
  const cutoff = now - SHAKE_WINDOW_MS;
  const recentShakes = shakeHistory?.filter((t) => t >= cutoff) || [];
  const shakesPerSecond = recentShakes.length / (SHAKE_WINDOW_MS / 1000);

  return Math.min(shakesPerSecond / MAX_SHAKES_PER_SECOND, 1);
};
