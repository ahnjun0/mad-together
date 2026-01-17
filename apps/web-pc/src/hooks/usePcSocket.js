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
    setRoomInfo,
    setConnected,
  } = useGameStore();

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket'],
      // Note: In production, add auth token
      // auth: { token: firebaseToken }
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('PC Socket connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('PC Socket disconnected');
      setConnected(false);
    });

    // Room state events
    socket.on('room_state', (data) => {
      console.log('Room state received:', data);
      
      if (data.room) {
        // Update room info
        setRoomInfo({
          code: data.room.code,
          teamAName: data.room.teamAName,
          teamBName: data.room.teamBName,
          status: data.room.status,
        });

        // Update game state based on room status
        const statusMap = {
          WAITING: 'WAITING',
          TUTORIAL: 'TUTORIAL',
          CASTING: 'CASTING',
          PLAYING: 'PLAYING',
          FINISHED: 'FINISHED',
        };
        if (statusMap[data.room.status]) {
          setGameState(statusMap[data.room.status]);
        }
      }

      // Update players list
      if (data.players && Array.isArray(data.players)) {
        updatePlayers(data.players);
      }
    });

    // Player events
    socket.on('player_joined', (data) => {
      console.log('Player joined:', data);
      // The room_state event will be triggered with updated players list
    });

    socket.on('player_left', (data) => {
      console.log('Player left:', data);
      // The room_state event will be triggered with updated players list
    });

    socket.on('player_updated', (data) => {
      console.log('Player updated:', data);
      // Update specific player in store
      const { playerId, ...updates } = data;
      if (playerId) {
        updatePlayers((prevPlayers) => {
          const allPlayers = [...(prevPlayers.A || []), ...(prevPlayers.B || [])];
          const playerIndex = allPlayers.findIndex((p) => p.id === playerId);
          if (playerIndex !== -1) {
            Object.assign(allPlayers[playerIndex], updates);
          }
          // Reorganize by team
          return {
            A: allPlayers.filter((p) => p.team === 'A'),
            B: allPlayers.filter((p) => p.team === 'B'),
          };
        });
      }
    });

    // Game events
    socket.on('score_update', (data) => {
      console.log('Score update:', data);
      if (data.teams) {
        setScore({
          A: data.teams.A || 0,
          B: data.teams.B || 0,
        });
      }
    });

    socket.on('game_started', () => {
      console.log('Game started');
      setGameState('PLAYING');
    });

    socket.on('game_ended', (data) => {
      console.log('Game ended:', data);
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
        sock.off('player_updated');
        sock.off('score_update');
        sock.off('game_started');
        sock.off('game_ended');
        sock.disconnect();
      }
    };
  }, [setGameState, updateScore, setScore, updatePlayers, setRoomInfo, setConnected]);

  // Emit functions
  const emitFunctions = {
    joinRoom: (roomId, playerId) => {
      if (socketRef.current) {
        socketRef.current.emit('join_room', { roomId, playerId });
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
  };

  return {
    socket: socketRef.current,
    ...emitFunctions,
  };
}
