import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useMobileStore } from '../store/useMobileStore';

const SERVER_URL = import.meta.env.VITE_API_URL;
const SOCKET_NAMESPACE = '/game';

export function useMobileSocket() {
  const socketRef = useRef(null);
  const { 
    token,
    roomId,
    playerId,
    myTeam,
    setGameState, 
    updateScore, 
    setConnected,
    setPlayerId,
    setTeam,
    setIsTeamLeader,
    setNickname,
    setToken,
    setRoomId
  } = useMobileStore();

  useEffect(() => {
    // 토큰이 없으면 연결하지 않음
    if (!token) return;

    // Initialize socket connection
    socketRef.current = io(`${SERVER_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket'],
      auth: { token },
    });

    const socket = socketRef.current;

    // Event Listeners
    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);

      // 연결/재연결 시 방 정보가 있다면 join_room 시도
      if (roomId && playerId) {
        socket.emit('join_room', { roomId, playerId });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('room_state', (data) => {
      console.log('Room state:', data);
      if (data.room?.status) {
        setGameState(data.room.status);
      }
      
      // 내 정보 동기화 및 전체 플레이어 목록 저장
      if (data.players && Array.isArray(data.players)) {
        useMobileStore.getState().setPlayers(data.players); // Store 액션 직접 호출 or destructuring 추가 필요
        
        if (playerId) {
            const me = data.players.find(p => p.id === playerId);
            if (me) {
              if (me.team) setTeam(me.team);
              // Note: isLeader 정보는 별도 이벤트나 로직으로 확인 필요할 수 있음
            }
        }
      }
    });
    
    // 게임 상태 이벤트
    socket.on('cinematic_started', () => setGameState('CINEMATIC'));
    socket.on('tutorial_started', () => setGameState('TUTORIAL'));
    socket.on('casting_phase', () => setGameState('CASTING'));
    socket.on('game_started', () => setGameState('PLAYING'));
    socket.on('game_ended', () => setGameState('FINISHED'));

    socket.on('score_update', (data) => {
      if (data.teams) {
        updateScore(data.teams);
      }
    });

    socket.on('leader_updated', (data) => {
      console.log('Leader updated:', data);
      if (data.newLeaderId === playerId) {
        setIsTeamLeader(true);
      } else if (data.team === myTeam) {
        setIsTeamLeader(false);
      }
    });
    
    socket.on('player_updated', (data) => {
       if (data.playerId === playerId) {
           if (data.team) setTeam(data.team);
           // isReady, sensorChecked 등도 여기서 처리 가능
       } 
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, roomId, playerId, myTeam]);

  // Join room function (HTTP API Call)
  const joinRoom = async (code, nickname) => {
    try {
      // 임시 토큰 생성 (개발용)
      // 실제로는 Firebase Auth 등 사용
      const tempToken = `dev-token-${Date.now()}`;
      
      const response = await fetch(`${SERVER_URL}/api/rooms/${code}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ nickname }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to join room');
      }

      const data = await response.json();
      
      // Store 업데이트 -> useEffect 트리거되어 소켓 연결됨
      setToken(tempToken);
      setPlayerId(data.playerId);
      setRoomId(data.roomId);
      setNickname(nickname);
      
      return data;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  };

  const shake = (count = 1) => {
    if (socketRef.current) socketRef.current.emit('shake', { count });
  };
  
  const cast = (power) => {
    if (socketRef.current) socketRef.current.emit('cast_action', { power });
  };
  
  const selectTeam = (team) => {
      if (socketRef.current) socketRef.current.emit('select_team', { team });
  };
  
  const delegateLeader = (newLeaderId) => {
      if (socketRef.current) socketRef.current.emit('delegate_leader', { newLeaderId });
  };

  return {
    socket: socketRef.current,
    joinRoom,
    shake,
    cast,
    selectTeam,
    delegateLeader
  };
}