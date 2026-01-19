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
      console.log('[Mobile] Room state received:', data);
      if (data.room?.status) {
        setGameState(data.room.status);
      }
      
      // 내 정보 동기화 및 전체 플레이어 목록 저장
      if (data.players && Array.isArray(data.players)) {
        // 정규화된 플레이어 데이터 저장
        const normalizedPlayers = data.players.map(p => ({
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
        
        useMobileStore.getState().setPlayers(normalizedPlayers);
        
        if (playerId) {
            const me = normalizedPlayers.find(p => (p.id || p.playerId) === playerId);
            if (me) {
              if (me.team) setTeam(me.team);
              if (me.isLeader !== undefined) setIsTeamLeader(me.isLeader);
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
      console.log('[Mobile] Player updated:', data);
      // 내 정보가 업데이트된 경우
      if (data.playerId === playerId || data.id === playerId) {
          if (data.team !== undefined) setTeam(data.team);
          if (data.isLeader !== undefined) setIsTeamLeader(data.isLeader);
          // isReady, sensorChecked는 room_state에서 동기화됨
      }
      
      // 전체 플레이어 목록도 업데이트 (다른 플레이어의 상태 변경 반영)
      const currentPlayers = useMobileStore.getState().players;
      if (Array.isArray(currentPlayers)) {
        const updatedPlayers = currentPlayers.map(p => {
          const pId = p.id || p.playerId;
          const dataId = data.playerId || data.id;
          if (pId === dataId) {
            return { ...p, ...data };
          }
          return p;
        });
        useMobileStore.getState().setPlayers(updatedPlayers);
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
  const joinRoom = async (code, nickname, googleToken = null) => {
    try {
      let accessToken = null;

      if (googleToken) {
        // 1. Google Login: Exchange ID Token for Access Token
        const authRes = await fetch(`${SERVER_URL}/api/auth/login/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: googleToken }),
        });

        if (!authRes.ok) {
           throw new Error('Google Authentication Failed');
        }

        const authData = await authRes.json();
        accessToken = authData.accessToken; // Server issued JWT Access Token
      } else {
        // 2. Dev Login: Use temporary token
        accessToken = `dev-token-${Date.now()}`;
      }
      
      // 3. Join Room with Access Token
      const response = await fetch(`${SERVER_URL}/api/rooms/${code}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ nickname }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to join room');
      }

      const data = await response.json();
      
      // Store 업데이트 -> useEffect 트리거되어 소켓 연결됨
      setToken(accessToken);
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
  
  const castAction = (power) => {
    if (socketRef.current) socketRef.current.emit('cast_action', { power });
  };

  const castComplete = () => {
    // myTeam state is available in hook scope
    if (socketRef.current && myTeam) {
        socketRef.current.emit('cast_complete', { team: myTeam });
    }
  };
  
  const selectTeam = (team) => {
      if (socketRef.current) socketRef.current.emit('select_team', { team });
  };
  
  const delegateLeader = (newLeaderId) => {
      if (socketRef.current) socketRef.current.emit('delegate_leader', { newLeaderId });
  };

  const toggleReady = () => {
    if (socketRef.current) socketRef.current.emit('toggle_ready');
  };

  const sensorChecked = () => {
    if (socketRef.current) socketRef.current.emit('sensor_checked');
  };

  return {
    socket: socketRef.current,
    joinRoom,
    shake,
    castAction,
    castComplete,
    selectTeam,
    delegateLeader,
    toggleReady,
    sensorChecked
  };
}