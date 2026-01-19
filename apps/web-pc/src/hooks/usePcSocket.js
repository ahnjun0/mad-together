import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';

const SOCKET_URL = 'https://madcamp.cloud';
const SOCKET_NAMESPACE = '/game';

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
    hostDevToken,
  } = useGameStore();

  useEffect(() => {
    // Initialize socket connection
    // 개발 모드: hostDevToken 사용, 프로덕션: Firebase 토큰 사용
    const authToken = hostDevToken || null; // 실제 프로덕션에서는 Firebase 토큰 사용
    
    socketRef.current = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket'],
      ...(authToken && { auth: { token: authToken } }),
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] ✅ PC Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ PC Socket disconnected:', reason);
      setConnected(false);
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

    socket.on('all_sensor_checked', () => {
      console.log('[Socket] 📱 All sensors checked');
      // 다음 단계 진행 가능 (시각적 큐는 TutorialView에서 처리)
    });

    // Game flow events
    socket.on('tutorial_started', () => {
      console.log('[Socket] 📚 Tutorial started');
      setGameState('TUTORIAL');
    });

    socket.on('leaders_selected', (data) => {
      console.log('[Socket] 👑 Leaders selected (RAW):', JSON.stringify(data, null, 2));
      // { teamA: "plxxx...", teamB: "plyyy..." }
      // Update players list to show Crown icons (👑) for leaders
      if (data && (data.teamA || data.teamB)) {
        // Reset all isLeader flags first, then set new leaders
        // We need to get current players to reset flags
        updatePlayers((prevPlayers) => {
          const allPlayers = [
            ...(prevPlayers.A || []), 
            ...(prevPlayers.B || []), 
            ...(prevPlayers.unassigned || [])
          ];
          
          // Reset all isLeader flags
          allPlayers.forEach((p) => {
            p.isLeader = false;
          });
          
          // Set isLeader for selected leaders
          if (data.teamA) {
            const leaderA = allPlayers.find((p) => (p.id || p.playerId) === data.teamA);
            if (leaderA) leaderA.isLeader = true;
          }
          if (data.teamB) {
            const leaderB = allPlayers.find((p) => (p.id || p.playerId) === data.teamB);
            if (leaderB) leaderB.isLeader = true;
          }
          
          // Reorganize by team
          return {
            A: allPlayers.filter((p) => p.team === 'A'),
            B: allPlayers.filter((p) => p.team === 'B'),
            unassigned: allPlayers.filter((p) => !p.team || p.team === null),
          };
        });
      }
    });

    socket.on('casting_phase', () => {
      console.log('[Socket] 🎣 Casting phase started');
      setGameState('CASTING');
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

    socket.on('game_started', () => {
      console.log('[Socket] 🎮 Game started');
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
        mvp: data.mvp,
      });
      
      if (data.teamScores) {
        setScore({
          A: data.teamScores.A || 0,
          B: data.teamScores.B || 0,
        });
      }
      setGameState('FINISHED');
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        const sock = socketRef.current;
        sock.off('connect');
        sock.off('disconnect');
        sock.off('room_state');
        sock.off('player_joined');
        sock.off('player_left');
        sock.off('player_disconnected');
        sock.off('player_updated');
        sock.off('all_ready');
        sock.off('all_sensor_checked');
        sock.off('tutorial_started');
        sock.off('leaders_selected');
        sock.off('casting_phase');
        sock.off('team_casted');
        sock.off('countdown');
        sock.off('score_update');
        sock.off('game_started');
        sock.off('cinematic_started');
        sock.off('game_ended');
        sock.disconnect();
      }
    };
  }, [setGameState, updateScore, setScore, updatePlayers, setPlayers, addPlayer, updatePlayer, removePlayer, setRoomInfo, setConnected, hostDevToken]);

  // Emit functions
  const emitFunctions = {
    joinRoom: (roomId, playerId) => {
      if (socketRef.current) {
        console.log('[Socket] 📡 Emitting join_room:', { roomId, playerId });
        socketRef.current.emit('join_room', { roomId, playerId });
      } else {
        console.warn('[Socket] ⚠️ Socket not connected, cannot join room');
      }
    },

    startTutorial: () => {
      if (socketRef.current) {
        socketRef.current.emit('start_tutorial');
      }
    },

    selectLeaders: () => {
      if (socketRef.current) {
        socketRef.current.emit('select_leaders');
      }
    },

    startCasting: () => {
      if (socketRef.current) {
        socketRef.current.emit('start_casting');
      }
    },

    startCountdown: () => {
      if (socketRef.current) {
        socketRef.current.emit('start_countdown');
      }
    },

    startCinematic: () => {
      if (socketRef.current && socketRef.current.connected) {
        console.log('[Socket] 📡 Emitting start_cinematic');
        socketRef.current.emit('start_cinematic');
      } else {
        console.warn('[Socket] ⚠️ Socket not connected, cannot start cinematic');
        alert('Socket 연결이 안 되어 있습니다. 잠시 후 다시 시도하세요.');
      }
    },
  };

  return {
    socket: socketRef.current,
    ...emitFunctions,
  };
}
