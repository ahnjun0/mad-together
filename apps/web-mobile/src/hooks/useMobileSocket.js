import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useMobileStore } from '../store/useMobileStore';

const SERVER_URL = 'https://madcamp.cloud';
const SOCKET_NAMESPACE = '/game';

export function useMobileSocket() {
  const socketRef = useRef(null);
  const { setGameState, updateScore, setConnected } = useMobileStore();

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(`${SERVER_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    // Event Listeners
    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('room_state', (data) => {
      console.log('Room state received:', data);
      if (data.room?.status) {
        const statusMap = {
          WAITING: 'WAITING',
          TUTORIAL: 'TUTORIAL',
          CASTING: 'TUTORIAL', // Map CASTING to TUTORIAL for mobile
          PLAYING: 'PLAYING',
          FINISHED: 'FINISHED',
        };
        setGameState(statusMap[data.room.status] || 'WAITING');
      }
    });

    socket.on('game_started', () => {
      console.log('Game started');
      setGameState('PLAYING');
    });

    socket.on('score_update', (data) => {
      console.log('Score update:', data);
      if (data.teams) {
        updateScore(data.teams);
      }
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [setGameState, updateScore, setConnected]);

  // Join room function
  const joinRoom = async (code, nickname) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/rooms/${code}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In production, add Authorization header with Firebase token
        },
        body: JSON.stringify({ nickname }),
      });

      if (!response.ok) {
        throw new Error('Failed to join room');
      }

      const data = await response.json();
      
      // Emit join_room socket event
      if (socketRef.current) {
        socketRef.current.emit('join_room', {
          roomId: data.roomId,
          playerId: data.playerId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  };

  // Shake function
  const shake = (count = 1) => {
    if (socketRef.current) {
      socketRef.current.emit('shake', { count });
    }
  };

  return {
    socket: socketRef.current,
    joinRoom,
    shake,
  };
}
