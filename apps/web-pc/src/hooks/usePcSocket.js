import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';

const SOCKET_URL = 'https://madcamp.cloud';
const SOCKET_NAMESPACE = '/game';

// 싱글톤 소켓 인스턴스 (모듈 레벨)
let socketInstance = null;
let currentAuthToken = null;
let isInitializing = false;

// 소켓 연결 대기 Promise
let connectionPromise = null;
let connectionResolve = null;

// Heartbeat interval (30초마다 서버에 heartbeat 전송)
let heartbeatInterval = null;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

export function usePcSocket() {
  const socketRef = useRef(null);
  const {
    setGameState,
    updateScore,
    setScore,
    updatePlayers,
    setPlayers,
    addPlayer,
    updatePlayer,
    removePlayer,
    setRoomInfo,
    setConnected,
    addShakeEvent,
    clearShakeHistory,
    accessToken, // 인증 토큰 (hostDevToken 대신)
    roomInfo,
    setCastingCountdown,
    setCastingStarted,
    setCastingPower,
    showAlert,
    setGameResult,
    startGameEnding,
  } = useGameStore();

  useEffect(() => {
    // 토큰이 변경되었거나 소켓이 없으면 새로 연결
    const authToken = accessToken || null;

    // 토큰이 없으면 연결하지 않음
    if (!authToken) {
      console.log('[PC] 🔒 No auth token, skipping socket connection');
      return;
    }

    // 이미 같은 토큰으로 연결된 소켓이 있으면 재사용
    if (socketInstance && currentAuthToken === authToken && socketInstance.connected) {
      console.log('[PC] 🔄 Reusing existing socket connection');
      socketRef.current = socketInstance;
      setConnected(true);
      return;
    }

    // 이미 초기화 중이면 대기
    if (isInitializing && currentAuthToken === authToken) {
      console.log('[PC] ⏳ Socket initialization in progress, waiting...');
      socketRef.current = socketInstance;
      return;
    }

    // 기존 소켓이 있고 토큰이 변경되었으면 연결 해제
    if (socketInstance && currentAuthToken !== authToken) {
      console.log('[PC] 🔄 Token changed, reconnecting with new token');
      socketInstance.disconnect();
      socketInstance = null;
    }

    isInitializing = true;
    currentAuthToken = authToken;

    // 새 연결 Promise 생성
    connectionPromise = new Promise((resolve) => {
      connectionResolve = resolve;
    });

    const socketUrl = `${SOCKET_URL}${SOCKET_NAMESPACE}`;
    console.log('[PC] 🔌 Connecting to:', socketUrl, 'with token:', authToken ? 'present' : 'none');

    socketInstance = io(socketUrl, {
      transports: ['websocket'],
      ...(authToken && { auth: { token: authToken } }),
    });

    socketRef.current = socketInstance;
    const socket = socketInstance;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] ✅ PC Socket connected:', socket.id);
      setConnected(true);
      isInitializing = false;

      // 연결 대기 Promise resolve
      if (connectionResolve) {
        connectionResolve();
        connectionResolve = null;
      }

      // 연결 완료 후 roomInfo가 있으면 자동으로 join_room 실행
      // Host는 Player가 아니므로 playerId 없이 입장
      const currentRoomInfo = useGameStore.getState().roomInfo;
      if (currentRoomInfo.roomId) {
        console.log('[Socket] Host (observer) auto-joining room:', currentRoomInfo.roomId);
        socket.emit('join_room', {
          roomId: currentRoomInfo.roomId,
          // playerId 없음 - Host는 Observer
        });
      }

      // Heartbeat interval 시작 (Host 연결 유지 확인)
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat');
        }
      }, HEARTBEAT_INTERVAL_MS);
      console.log('[Socket] 💓 Heartbeat interval started');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ PC Socket disconnected:', reason);
      setConnected(false);
      isInitializing = false;

      // Heartbeat interval 정리
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('[Socket] 💔 Heartbeat interval stopped');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] ❌ Connection error:', error.message);
      setConnected(false);
      isInitializing = false;
    });

    // Room state events
    socket.on('room_state', (data) => {
      console.log('[Socket] 📋 Room state received (RAW):', JSON.stringify(data, null, 2));

      if (data.room) {
        // Update room info
        setRoomInfo({
          roomId: data.room.id, // Ensure roomId is set
          code: data.room.code,
          teamAName: data.room.teamAName,
          teamBName: data.room.teamBName,
          status: data.room.status,
        });

        // Update game state based on room status
        const statusMap = {
          WAITING: 'WAITING',
          CINEMATIC: 'CINEMATIC',
          TUTORIAL: 'TUTORIAL',
          CASTING: 'CASTING',
          PLAYING: 'PLAYING',
          FINISHED: 'FINISHED',
        };
        if (statusMap[data.room.status]) {
          console.log('[Socket] 🎮 Game state updated:', data.room.status);
          setGameState(statusMap[data.room.status]);
        }
      }

      // 팀 점수 동기화 (PLAYING/FINISHED 상태에서 재접속 시)
      if (data.teamScores) {
        console.log('[Socket] 📊 Team scores synced:', data.teamScores);
        setScore({
          A: data.teamScores.A || 0,
          B: data.teamScores.B || 0,
        });
      }

      // Update players list with normalization
      if (data.players && Array.isArray(data.players)) {
        console.log('[Socket] 👥 Raw Player Data:', data.players);
        console.log('[Socket] 👥 Players count:', data.players.length);
        
        // Normalize player data (Adapter pattern)
        const normalizedPlayers = data.players.map((p) => {
          const normalized = {
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
          };
          console.log('[Socket] 👤 Normalized player:', normalized);
          return normalized;
        });
        
        console.log('[Socket] 👥 Setting players in store:', normalizedPlayers.length, 'players');
        setPlayers(normalizedPlayers);
      } else {
        console.warn('[Socket] ⚠️ No players array in room_state:', data);
      }
    });

    // Player events
    socket.on('player_joined', (data) => {
      console.log('[Socket] ➕ Player joined (RAW):', JSON.stringify(data, null, 2));
      
      // Normalize and add player
      if (data.playerId || data.id) {
        const normalized = {
          id: data.id || data.playerId,
          playerId: data.playerId || data.id,
          nickname: data.nickname || 'Unknown',
          team: data.team || null,
          isHost: data.isHost || false,
          isReady: data.isReady || false,
          isLeader: data.isLeader || false,
          sensorChecked: data.sensorChecked || false,
          score: data.score || 0,
          ...data,
        };
        console.log('[Socket] ➕ Adding normalized player:', normalized);
        addPlayer(normalized);
      }
      // Note: room_state will also be triggered, but we handle it immediately for better UX
    });

    socket.on('player_left', (data) => {
      console.log('[Socket] ➖ Player left (RAW):', JSON.stringify(data, null, 2));
      
      const playerId = data.playerId || data.id;
      if (playerId) {
        console.log('[Socket] ➖ Removing player:', playerId);
        removePlayer(playerId);
      }
      // The room_state event will also be triggered with updated players list
    });

    socket.on('player_disconnected', (data) => {
      console.log('[Socket] 🔌 Player disconnected (RAW):', JSON.stringify(data, null, 2));
      
      const playerId = data.playerId || data.id;
      if (playerId) {
        console.log('[Socket] 🔌 Removing disconnected player:', playerId);
        removePlayer(playerId);
      }
      // The room_state event will also be triggered with updated players list
    });

    socket.on('player_updated', (data) => {
      console.log('[Socket] 🔄 Player updated (RAW):', JSON.stringify(data, null, 2));
      
      // Update specific player in store
      const playerId = data.playerId || data.id;
      if (playerId) {
        const { playerId: _, id: __, ...updates } = data;
        console.log('[Socket] 🔄 Updating player:', playerId, 'with updates:', updates);
        updatePlayer(playerId, updates);
      } else {
        console.warn('[Socket] ⚠️ player_updated event missing playerId:', data);
      }
    });

    socket.on('all_ready', () => {
      console.log('[Socket] ✅ All players ready');
      // PC: 호스트가 게임 시작 버튼 활성화 가능
    });

    socket.on('team_imbalance', (data) => {
      console.log('[Socket] ⚠️ Team imbalance:', data);
      showAlert(
        'warning',
        data.message || '양 팀의 인원 수가 같아야 게임을 시작할 수 있습니다.',
        { teamACount: data.teamACount, teamBCount: data.teamBCount }
      );
    });

    socket.on('team_full', (data) => {
      console.log('[Socket] ⚠️ Team full:', data);
      showAlert(
        'warning',
        data.message || `팀이 최대 인원(${data.maxPlayers}명)에 도달했습니다.`,
        { team: data.team, maxPlayers: data.maxPlayers }
      );
    });

    socket.on('all_sensor_checked', () => {
      console.log('[Socket] 📱 All sensors checked');
      // 다음 단계 진행 가능 (시각적 큐는 TutorialView에서 처리)
    });

    // 팀장 변경 이벤트 (팀장 퇴장 또는 위임 시)
    socket.on('leader_updated', (data) => {
      console.log('[Socket] 👑 Leader updated:', data);
      const { team, newLeaderId } = data;
      if (!team || !newLeaderId) return;

      // 해당 팀의 모든 플레이어에서 isLeader를 false로 설정하고,
      // 새 리더의 isLeader를 true로 설정
      const currentPlayers = useGameStore.getState().players;
      const teamKey = team === 'A' ? 'A' : team === 'B' ? 'B' : null;
      if (!teamKey) return;

      const updatedTeamPlayers = (currentPlayers[teamKey] || []).map(player => ({
        ...player,
        isLeader: (player.id === newLeaderId || player.playerId === newLeaderId),
      }));

      // store 업데이트
      useGameStore.setState((state) => ({
        players: {
          ...state.players,
          [teamKey]: updatedTeamPlayers,
        },
      }));
    });

    // Game flow events
    socket.on('tutorial_started', () => {
      console.log('[Socket] 📚 Tutorial started');
      setGameState('TUTORIAL');
    });

    socket.on('casting_phase', () => {
      console.log('[Socket] 🎣 Casting phase started');
      setGameState('CASTING');
    });

    socket.on('casting_countdown', (data) => {
      console.log('[Socket] ⏰ Casting countdown:', data);
      if (typeof data?.count === 'number') {
        setCastingCountdown(data.count);
      }
    });

    socket.on('casting_start', () => {
      console.log('[Socket] 🎣 Casting start signal received');
      // casting_start 시점에서 로컬 카운트다운을 0으로 표시
      setCastingCountdown(0);
      setCastingStarted(true);
      // 1초 후 카운트다운 패널 숨기기
      setTimeout(() => {
        useGameStore.getState().setCastingCountdown(null);
      }, 1000);
    });

    socket.on('cast_result', (data) => {
      console.log('[Socket] 🎯 Cast result received:', data);
      if (!data || !data.team) return;
      const teamKey = data.team === 'A' || data.team === 'B' ? data.team : null;
      if (!teamKey) return;
      setCastingPower(teamKey, typeof data.power === 'number' ? data.power : 0);
    });

    socket.on('team_casted', (data) => {
      console.log('[Socket] 🪝 Team casted:', data);
      // { team: "A" }
    });

    socket.on('countdown', (data) => {
      console.log('[Socket] ⏰ Countdown:', data.count);
      // { count: 10 } → { count: 9 } → ... → { count: 0 }
    });

    socket.on('cinematic_started', () => {
      console.log('[Socket] 🎬 Cinematic started');
      setGameState('CINEMATIC');
    });

    socket.on('game_started', (data) => {
      console.log('[Socket] 🎮 Game started:', data);
      clearShakeHistory(); // Reset shake history for new game

      // 캐스팅 보너스 점수가 적용된 초기 점수 설정
      if (data?.initialScores) {
        setScore({
          A: data.initialScores.A || 0,
          B: data.initialScores.B || 0,
        });
        console.log('[Socket] 🎣 Casting bonus applied:', {
          winner: data.castingWinner,
          bonus: data.bonusScore,
          initialScores: data.initialScores,
        });
      }

      setGameState('PLAYING');
    });

    // CRITICAL: Score update (real-time)
    socket.on('score_update', (data) => {
      console.log('[Socket] 📊 Score update received:', {
        event: data.event,
        teams: data.teams,
        fishPosition: data.teams ? (data.teams.A + data.teams.B > 0 ? data.teams.A / (data.teams.A + data.teams.B) : 0.5) : null,
      });

      if (data.teams) {
        const newScore = {
          A: data.teams.A || 0,
          B: data.teams.B || 0,
        };
        console.log('[Socket] 📊 Updating store score:', newScore);
        setScore(newScore);

        // Track shake event for fishing rod animation
        // 게임 종료 연출 중에는 shake 이벤트를 처리하지 않음
        const state = useGameStore.getState();
        const endingState = state.gameEndingState;
        const currentPlayers = state.players;

        if (data.event && data.event.team && !endingState.isEnding) {
          // Find player info for floating UI
          let userInfo = null;
          const playerId = data.event.playerId || data.event.id;
          const nickname = data.event.nickname;
          
          if (playerId || nickname) {
            // Find player in the specific team list
            const teamPlayers = currentPlayers[data.event.team] || [];
            const foundPlayer = teamPlayers.find(p => 
              (playerId && (p.id === playerId || p.playerId === playerId)) || 
              (!playerId && p.nickname === nickname)
            );

            if (foundPlayer) {
              userInfo = {
                nickname: foundPlayer.nickname,
                profileImage: foundPlayer.profileImage,
              };
            } else if (nickname) {
              // Fallback if player not found in store but nickname exists in event
              userInfo = {
                nickname: nickname,
                profileImage: null,
              };
            }
          }

          addShakeEvent(data.event.team, userInfo);
          console.log('[Socket] 🎣 Shake event tracked for team:', data.event.team, userInfo);
        }

        // Show player who shook (optional: can be used for floating nickname)
        if (data.event) {
          console.log('[Socket] 🎯 Player shook:', {
            nickname: data.event.nickname,
            team: data.event.team,
            amount: data.event.amount,
          });
        }
      }
    });

    socket.on('game_ended', (data) => {
      console.log('[Socket] 🏁 Game ended:', {
        winnerTeam: data.winnerTeam,
        teamScores: data.teamScores,
        caughtItemIndex: data.caughtItemIndex,
        playerScores: data.playerScores,
        mvp: data.mvp,
      });

      if (data.teamScores) {
        setScore({
          A: data.teamScores.A || 0,
          B: data.teamScores.B || 0,
        });
      }

      // Save game result with player scores and MVP
      setGameResult({
        winnerTeam: data.winnerTeam,
        playerScores: data.playerScores || [],
        mvp: data.mvp || null,
      });

      // 바로 FINISHED로 가지 않고, 게임 종료 연출 시작
      // PlayingView에서 애니메이션 후 모달을 표시하고, 종료 버튼으로 FINISHED로 이동
      startGameEnding(data.winnerTeam, data.caughtItemIndex ?? 0);
    });

    // 게임 강제 종료 (Host 타임아웃 또는 Host 종료)
    socket.on('game_terminated', (data) => {
      console.log('[Socket] 🛑 Game terminated:', data);
      showAlert('warning', data.message || '게임이 종료되었습니다.');
      setGameState('HOME');
      // 방 정보 초기화
      setRoomInfo({
        roomId: null,
        code: null,
        qrCode: null,
        teamAName: 'A팀',
        teamBName: 'B팀',
        maxPlayers: 10,
        status: null,
      });
    });

    // 게임 종료 에러
    socket.on('terminate_error', (data) => {
      console.log('[Socket] ❌ Terminate error:', data);
      showAlert('error', data.message || '게임 종료 중 오류가 발생했습니다.');
    });

    // Kick 에러
    socket.on('kick_error', (data) => {
      console.log('[Socket] ❌ Kick error:', data);
      showAlert('error', data.message || '플레이어 퇴장 처리 중 오류가 발생했습니다.');
    });

    // Cleanup - 싱글톤이므로 리스너만 제거하고 연결은 유지
    // 앱이 언마운트될 때만 완전히 연결 해제
    return () => {
      // 리스너 제거는 하지 않음 (싱글톤 유지)
      // 필요시 아래 주석 해제하여 리스너만 제거
      // socket.off('room_state');
      // etc...
    };
  }, [setGameState, updateScore, setScore, updatePlayers, setPlayers, addPlayer, updatePlayer, removePlayer, setRoomInfo, setConnected, addShakeEvent, clearShakeHistory, accessToken, showAlert, setGameResult]);

  // 소켓 연결 대기 헬퍼
  const waitForConnection = useCallback(async () => {
    if (socketInstance && socketInstance.connected) {
      return true;
    }
    if (connectionPromise) {
      await connectionPromise;
      return true;
    }
    return false;
  }, []);

  // Emit functions - 싱글톤 소켓 사용
  // Host는 playerId 없이, Player는 playerId와 함께 입장
  const joinRoom = useCallback(async (roomId, playerId = null) => {
    console.log('[Socket] joinRoom called:', { roomId, playerId, isHost: !playerId });

    // 소켓 연결 대기
    if (!socketInstance?.connected) {
      console.log('[Socket] Waiting for socket connection...');
      await waitForConnection();
    }

    if (socketInstance?.connected) {
      const payload = playerId
        ? { roomId, playerId } // Player 입장
        : { roomId }; // Host (observer) 입장
      console.log('[Socket] Emitting join_room:', payload);
      socketInstance.emit('join_room', payload);
    } else {
      console.warn('[Socket] Socket not connected, cannot join room');
    }
  }, [waitForConnection]);

  const startTutorial = useCallback(() => {
    if (socketInstance?.connected) {
      socketInstance.emit('start_tutorial');
    }
  }, []);

  const startCasting = useCallback(() => {
    if (socketInstance?.connected) {
      socketInstance.emit('start_casting');
    }
  }, []);

  const startCountdown = useCallback(() => {
    if (socketInstance?.connected) {
      socketInstance.emit('start_countdown');
    }
  }, []);

  const startCastingTimer = useCallback(() => {
    if (socketInstance?.connected) {
      console.log('[Socket] ⏰ Emitting start_casting_timer');
      socketInstance.emit('start_casting_timer');
    }
  }, []);

  const startCinematic = useCallback(() => {
    if (socketInstance?.connected) {
      console.log('[Socket] 📡 Emitting start_cinematic');
      socketInstance.emit('start_cinematic');
    } else {
      console.warn('[Socket] ⚠️ Socket not connected, cannot start cinematic');
      alert('Socket 연결이 안 되어 있습니다. 잠시 후 다시 시도하세요.');
    }
  }, []);

  // 게임 종료 (Host 전용, PLAYING 상태가 아닐 때만)
  const terminateGame = useCallback(() => {
    if (socketInstance?.connected) {
      console.log('[Socket] 🛑 Emitting terminate_game');
      socketInstance.emit('terminate_game');
    } else {
      console.warn('[Socket] ⚠️ Socket not connected, cannot terminate game');
    }
  }, []);

  // 플레이어 강제 퇴장 (Host 전용, WAITING 상태에서만)
  const kickPlayer = useCallback((playerId) => {
    if (socketInstance?.connected) {
      console.log('[Socket] 🦵 Emitting kick_player:', playerId);
      socketInstance.emit('kick_player', { playerId });
    } else {
      console.warn('[Socket] ⚠️ Socket not connected, cannot kick player');
    }
  }, []);

  // 게임 초기화 및 대기방 복귀 (Host 전용)
  const resetGame = useCallback(() => {
    if (socketInstance?.connected) {
      console.log('[Socket] 🔄 Emitting reset_game');
      socketInstance.emit('reset_game');
    } else {
      console.warn('[Socket] ⚠️ Socket not connected, cannot reset game');
    }
  }, []);

  // 방 상태 요청 (각 View 마운트 시 최신 데이터 동기화용)
  const requestRoomState = useCallback(() => {
    if (socketInstance?.connected) {
      console.log('[Socket] 🔄 Requesting room state');
      socketInstance.emit('request_room_state');
    }
  }, []);

  // 소켓 연결 상태 반환
  const isConnected = socketInstance?.connected || false;

  return {
    socket: socketInstance,
    isConnected,
    joinRoom,
    startTutorial,
    startCasting,
    startCountdown,
    startCastingTimer,
    startCinematic,
    terminateGame,
    resetGame,
    kickPlayer,
    requestRoomState,
    waitForConnection,
  };
}
