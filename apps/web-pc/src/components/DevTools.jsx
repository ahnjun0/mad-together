// DevTools component for the game
// This component is used to debug the game and the score
// It is only visible in development mode

import { useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';
import { joinRoomAsBot, generateDevToken } from '../api/room';

const SOCKET_URL = 'https://madcamp.cloud';
const SOCKET_NAMESPACE = '/game';
const DEV_AUTH_TOKEN = 'dev-token'; // 서버의 DEV_AUTH_TOKEN과 일치해야 함

const GAME_STATES = ['WAITING', 'CINEMATIC', 'TUTORIAL', 'CASTING', 'PLAYING', 'FINISHED'];

export default function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  const {
    gameState,
    setGameState,
    score,
    updateScore,
    setScore,
    addMockPlayer,
    toggleReadyAll,
    clearPlayers,
    resetScore,
    addShakeEvent,
  } = useGameStore();

  // Mock player ID counter (for local store bots - deprecated)
  const [playerIdCounter, setPlayerIdCounter] = useState(1);
  
  // Bot socket connections (for real socket simulation)
  const botSocketsRef = useRef([]); // Array of { socket, team, playerId, nickname, botId }
  const [botSocketsList, setBotSocketsList] = useState([]); // React state for re-rendering
  const { roomInfo } = useGameStore();

  // Sync ref with state for re-rendering
  const updateBotSocketsList = () => {
    setBotSocketsList([...botSocketsRef.current]);
  };

  const generateMockPlayer = (team, name) => ({
    id: `bot-${team}-${playerIdCounter}`,
    nickname: name || `Bot ${team}-${playerIdCounter}`,
    team,
    isReady: false,
    isHost: false,
    sensorChecked: false,
    score: 0,
  });

  const handleAddBotA = () => {
    const player = generateMockPlayer('A', `Bot A-${playerIdCounter}`);
    addMockPlayer('A', player);
    setPlayerIdCounter((prev) => prev + 1);
  };

  const handleAddBotB = () => {
    const player = generateMockPlayer('B', `Bot B-${playerIdCounter}`);
    addMockPlayer('B', player);
    setPlayerIdCounter((prev) => prev + 1);
  };

  const handleFakeShakeA = () => {
    // 로컬 store만 조작 (UI 테스트용)
    // 실제 서버로 보내려면 Tab 4의 봇을 사용하거나, 봇 소켓이 있으면 그것을 사용
    console.log('[DevTools] 📳 Fake Shake (A) - 로컬 store만 업데이트 (서버 통신 없음)');
    updateScore('A', 10);
    addShakeEvent('A'); // Trigger fishing rod animation
  };

  const handleFakeShakeB = () => {
    // 로컬 store만 조작 (UI 테스트용)
    console.log('[DevTools] 📳 Fake Shake (B) - 로컬 store만 업데이트 (서버 통신 없음)');
    updateScore('B', 10);
    addShakeEvent('B'); // Trigger fishing rod animation
  };

  // 실제 서버로 shake 이벤트 전송 (봇 소켓 사용)
  const handleRealShakeA = () => {
    const connectedBots = botSocketsRef.current.filter(b => b.team === 'A' && b.socket?.connected);
    if (connectedBots.length === 0) {
      alert('Team A 봇이 없거나 연결되지 않았습니다.\nTab 4에서 봇을 생성하고 연결을 확인하세요.');
      return;
    }
    // 첫 번째 Team A 봇으로 shake 전송
    const bot = connectedBots[0];
    console.log('[DevTools] 📳 Real Shake (A) - 서버로 전송:', bot.nickname);
    try {
      bot.socket.emit('shake', { count: 1 });
      console.log('[DevTools] ✅ Shake 이벤트 전송 완료');
      // alert는 제거 (콘솔 로그만)
    } catch (error) {
      console.error('[DevTools] ❌ Shake 이벤트 전송 실패:', error);
      alert(`Shake 이벤트 전송 실패: ${error.message}`);
    }
  };

  const handleRealShakeB = () => {
    const connectedBots = botSocketsRef.current.filter(b => b.team === 'B' && b.socket?.connected);
    if (connectedBots.length === 0) {
      alert('Team B 봇이 없거나 연결되지 않았습니다.\nTab 4에서 봇을 생성하고 연결을 확인하세요.');
      return;
    }
    // 첫 번째 Team B 봇으로 shake 전송
    const bot = connectedBots[0];
    console.log('[DevTools] 📳 Real Shake (B) - 서버로 전송:', bot.nickname);
    try {
      bot.socket.emit('shake', { count: 1 });
      console.log('[DevTools] ✅ Shake 이벤트 전송 완료');
      // alert는 제거 (콘솔 로그만)
    } catch (error) {
      console.error('[DevTools] ❌ Shake 이벤트 전송 실패:', error);
      alert(`Shake 이벤트 전송 실패: ${error.message}`);
    }
  };

  const handleWinGameA = () => {
    setScore({ A: 1000, B: 500 });
    setGameState('FINISHED');
  };

  const handleWinGameB = () => {
    setScore({ A: 500, B: 1000 });
    setGameState('FINISHED');
  };

  const handleTriggerHit = () => {
    // Reset scores and transition to PLAYING
    resetScore();
    setGameState('PLAYING');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-black/80 text-white rounded-full shadow-lg z-50 flex items-center justify-center hover:bg-black/90 transition-all"
        title="Open DevTools"
      >
        <span className="text-xl">⚙️</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-black/90 text-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h2 className="text-sm font-bold">DevTools</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {['State', 'Users', 'Game', 'Bot', 'Flow Test'].map((tab, index) => (
          <button
            key={tab}
            onClick={() => setActiveTab(index)}
            className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === index
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Tab 1: Game State Control */}
        {activeTab === 0 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">
              Current: <span className="font-mono text-white">{gameState}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GAME_STATES.map((state) => (
                <button
                  key={state}
                  onClick={() => setGameState(state)}
                  className={`px-3 py-2 text-xs rounded transition-all ${
                    gameState === state
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-700">
              <button
                onClick={resetScore}
                className="w-full px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              >
                Reset Scores
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Mock User Simulation (Local Store Only - UI Testing) */}
        {activeTab === 1 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">
              로컬 store만 조작 (UI 테스트용)
            </div>
            
            <div className="p-2 bg-red-500/20 border border-red-500 rounded text-xs text-red-300 mb-3">
              ⚠️ 이 탭의 버튼은 로컬 store만 조작합니다.<br />
              실제 서버와 DB에 유저를 추가하려면<br />
              <span className="font-bold">Tab 4 "Bot" 탭</span>의 "Spawn Bot" 버튼을 사용하세요.
            </div>

            <div className="space-y-2">
              <button
                onClick={handleAddBotA}
                className="w-full px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 rounded text-white font-semibold"
              >
                ➕ Add Bot User A (로컬만)
              </button>
              <button
                onClick={handleAddBotB}
                className="w-full px-3 py-2 text-xs bg-cyan-600 hover:bg-cyan-700 rounded text-white font-semibold"
              >
                ➕ Add Bot User B (로컬만)
              </button>
              <button
                onClick={toggleReadyAll}
                className="w-full px-3 py-2 text-xs bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
              >
                ✓ Toggle Ready All
              </button>
              <button
                onClick={clearPlayers}
                className="w-full px-3 py-2 text-xs bg-red-600 hover:bg-red-700 rounded text-white font-semibold"
              >
                🗑️ Clear All Players
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Game Logic Simulation */}
        {activeTab === 2 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">
              게임 이벤트 시뮬레이션
            </div>
            
            <div className="p-2 bg-yellow-500/20 border border-yellow-500 rounded text-xs text-yellow-300 mb-3">
              ⚠️ "Fake Shake"는 로컬 store만 조작합니다.<br />
              실제 서버 통신은 Tab 4의 봇을 사용하세요.
            </div>

            <div className="space-y-2">
              <button
                onClick={handleTriggerHit}
                className="w-full px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white font-semibold"
              >
                🎣 Trigger HIT (→ PLAYING)
              </button>
              
              <div className="text-xs text-gray-500 mb-1">로컬 Store 조작 (UI 테스트):</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFakeShakeA}
                  className="px-3 py-2 text-xs bg-orange-500 hover:bg-orange-600 rounded text-white font-semibold"
                >
                  📳 Fake Shake (A) +10
                </button>
                <button
                  onClick={handleFakeShakeB}
                  className="px-3 py-2 text-xs bg-cyan-500 hover:bg-cyan-600 rounded text-white font-semibold"
                >
                  📳 Fake Shake (B) +10
                </button>
              </div>

              <div className="text-xs text-gray-500 mb-1 mt-3">실제 서버 통신 (Tab 4 봇 필요):</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRealShakeA}
                  disabled={botSocketsList.filter(b => b.team === 'A' && b.socket?.connected).length === 0}
                  className={`px-3 py-2 text-xs rounded text-white font-semibold transition-all ${
                    botSocketsList.filter(b => b.team === 'A' && b.socket?.connected).length === 0
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
                  }`}
                >
                  📡 Real Shake (A) 🚀
                </button>
                <button
                  onClick={handleRealShakeB}
                  disabled={botSocketsList.filter(b => b.team === 'B' && b.socket?.connected).length === 0}
                  className={`px-3 py-2 text-xs rounded text-white font-semibold transition-all ${
                    botSocketsList.filter(b => b.team === 'B' && b.socket?.connected).length === 0
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-cyan-600 hover:bg-cyan-700 active:scale-95'
                  }`}
                >
                  📡 Real Shake (B) 🚀
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                연결된 봇: A({botSocketsList.filter(b => b.team === 'A' && b.socket?.connected).length}) 
                / B({botSocketsList.filter(b => b.team === 'B' && b.socket?.connected).length})
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={handleWinGameA}
                  className="px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 rounded text-white font-semibold"
                >
                  🏆 Win Game (A)
                </button>
                <button
                  onClick={handleWinGameB}
                  className="px-3 py-2 text-xs bg-cyan-600 hover:bg-cyan-700 rounded text-white font-semibold"
                >
                  🏆 Win Game (B)
                </button>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-700 text-xs">
              <div className="text-gray-400 mb-1">Current Scores:</div>
              <div className="flex justify-between">
                <span className="text-orange-400">A: {score.A}</span>
                <span className="text-cyan-400">B: {score.B}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Bot Simulator (Real Socket) */}
        {activeTab === 3 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">
              실제 Socket 연결을 통한 봇 시뮬레이션
              <br />
              <span className="text-green-400">✓ 개발 모드 토큰 사용 (DEV_AUTH_ENABLED=true 필요)</span>
            </div>
            
            {!roomInfo.code && (
              <div className="p-2 bg-yellow-500/20 border border-yellow-500 rounded text-xs text-yellow-300">
                ⚠️ 먼저 방을 생성해야 봇을 추가할 수 있습니다.
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={async () => {
                  if (!roomInfo.code || !roomInfo.roomId) {
                    alert('먼저 방을 생성하세요.');
                    return;
                  }

                  try {
                    // 1. 개발 토큰 생성
                    const botId = `bot-A-${Date.now()}`;
                    const devToken = `${DEV_AUTH_TOKEN}-${botId}`;
                    const nickname = `Bot A-${botSocketsRef.current.filter(b => b.team === 'A').length + 1}`;

                    console.log('[Bot] 🚀 Starting bot creation:', { botId, nickname, roomCode: roomInfo.code });

                    // 2. API 호출로 playerId 얻기
                    console.log('[Bot] 📡 Calling joinRoomAsBot API...');
                    const joinData = await joinRoomAsBot(roomInfo.code, devToken, nickname);
                    console.log('[Bot] ✅ API Response:', joinData);
                    
                    if (!joinData.roomId || !joinData.playerId) {
                      throw new Error('Invalid API response: missing roomId or playerId');
                    }
                    
                    const { roomId, playerId } = joinData;
                    console.log('[Bot] ✅ Got roomId and playerId:', { roomId, playerId });

                    // 3. Socket 연결 생성 (forceNew: true로 독립적인 연결)
                    const botSocket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
                      transports: ['websocket'],
                      forceNew: true, // 새로운 독립적인 Socket 연결
                      auth: { token: devToken },
                    });

                    // Socket 연결 완료를 Promise로 처리
                    await new Promise((resolve, reject) => {
                      const timeout = setTimeout(() => {
                        reject(new Error('Socket connection timeout'));
                      }, 10000); // 10초 타임아웃

                      botSocket.on('connect', async () => {
                        clearTimeout(timeout);
                        console.log('[Bot] ✅ Bot socket connected:', botId, 'Socket ID:', botSocket.id);

                        // 봇 정보 저장 (연결된 후에만 저장)
                        const botInfo = { socket: botSocket, team: 'A', playerId, nickname, botId };
                        botSocketsRef.current.push(botInfo);
                        updateBotSocketsList(); // React state 업데이트로 리렌더링 트리거

                        // 4. join_room emit
                        console.log('[Bot] 📡 Emitting join_room:', { roomId, playerId });
                        botSocket.emit('join_room', { roomId, playerId });

                        // room_state 이벤트 리스너 (서버가 플레이어 목록을 업데이트하면 로그)
                        botSocket.on('room_state', (data) => {
                          console.log('[Bot] 📋 Bot received room_state:', {
                            playersCount: data.players?.length || 0,
                          });
                          // 호스트 소켓도 동일한 room_state를 받아야 함
                        });

                        // player_joined 이벤트 리스너
                        botSocket.on('player_joined', (data) => {
                          console.log('[Bot] ➕ Bot received player_joined:', data);
                        });

                        // 5. select_team emit (Team A) - room_state를 받은 후에 실행
                        setTimeout(() => {
                          console.log('[Bot] 📡 Emitting select_team: A');
                          botSocket.emit('select_team', { team: 'A' });
                        }, 1000);

                        // 6. toggle_ready emit
                        setTimeout(() => {
                          console.log('[Bot] 📡 Emitting toggle_ready');
                          botSocket.emit('toggle_ready');
                        }, 1500);

                        resolve();
                      });

                      botSocket.on('connect_error', (error) => {
                        clearTimeout(timeout);
                        console.error('[Bot] ❌ Socket connection error:', error);
                        reject(error);
                      });
                    });

                    botSocket.on('disconnect', (reason) => {
                      console.log('[Bot] ❌ Bot socket disconnected:', botId, reason);
                      // 연결 상태 업데이트
                      const botIndex = botSocketsRef.current.findIndex(b => b.botId === botId);
                      if (botIndex !== -1) {
                        updateBotSocketsList();
                      }
                    });

                    alert(`봇 생성 완료: ${nickname}\nSocket 연결 완료.`);
                  } catch (error) {
                    console.error('Error spawning bot:', error);
                    alert(`봇 생성 실패: ${error.message}`);
                  }
                }}
                disabled={!roomInfo.code || !roomInfo.roomId}
                className={`w-full px-3 py-2 text-xs rounded text-white font-semibold transition-all ${
                  !roomInfo.code || !roomInfo.roomId
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
                }`}
              >
                🤖 Spawn Bot (Team A)
              </button>
              
              <button
                onClick={async () => {
                  if (!roomInfo.code || !roomInfo.roomId) {
                    alert('먼저 방을 생성하세요.');
                    return;
                  }

                  try {
                    // 1. 개발 토큰 생성
                    const botId = `bot-B-${Date.now()}`;
                    const devToken = `${DEV_AUTH_TOKEN}-${botId}`;
                    const nickname = `Bot B-${botSocketsRef.current.filter(b => b.team === 'B').length + 1}`;

                    console.log('[Bot] 🚀 Starting bot creation:', { botId, nickname, roomCode: roomInfo.code });

                    // 2. API 호출로 playerId 얻기
                    console.log('[Bot] 📡 Calling joinRoomAsBot API...');
                    const joinData = await joinRoomAsBot(roomInfo.code, devToken, nickname);
                    console.log('[Bot] ✅ API Response:', joinData);
                    
                    if (!joinData.roomId || !joinData.playerId) {
                      throw new Error('Invalid API response: missing roomId or playerId');
                    }
                    
                    const { roomId, playerId } = joinData;
                    console.log('[Bot] ✅ Got roomId and playerId:', { roomId, playerId });

                    // 3. Socket 연결 생성 (forceNew: true로 독립적인 연결)
                    const botSocket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
                      transports: ['websocket'],
                      forceNew: true, // 새로운 독립적인 Socket 연결
                      auth: { token: devToken },
                    });

                    // Socket 연결 완료를 Promise로 처리
                    await new Promise((resolve, reject) => {
                      const timeout = setTimeout(() => {
                        reject(new Error('Socket connection timeout'));
                      }, 10000); // 10초 타임아웃

                      botSocket.on('connect', async () => {
                        clearTimeout(timeout);
                        console.log('[Bot] ✅ Bot socket connected:', botId, 'Socket ID:', botSocket.id);

                        // 봇 정보 저장 (연결된 후에만 저장)
                        const botInfo = { socket: botSocket, team: 'B', playerId, nickname, botId };
                        botSocketsRef.current.push(botInfo);
                        updateBotSocketsList(); // React state 업데이트로 리렌더링 트리거

                        // 4. join_room emit
                        console.log('[Bot] 📡 Emitting join_room:', { roomId, playerId });
                        botSocket.emit('join_room', { roomId, playerId });

                        // room_state 이벤트 리스너 (서버가 플레이어 목록을 업데이트하면 로그)
                        botSocket.on('room_state', (data) => {
                          console.log('[Bot] 📋 Bot received room_state:', {
                            playersCount: data.players?.length || 0,
                          });
                          // 호스트 소켓도 동일한 room_state를 받아야 함
                        });

                        // player_joined 이벤트 리스너
                        botSocket.on('player_joined', (data) => {
                          console.log('[Bot] ➕ Bot received player_joined:', data);
                        });

                        // 5. select_team emit (Team B) - room_state를 받은 후에 실행
                        setTimeout(() => {
                          console.log('[Bot] 📡 Emitting select_team: B');
                          botSocket.emit('select_team', { team: 'B' });
                        }, 1000);

                        // 6. toggle_ready emit
                        setTimeout(() => {
                          console.log('[Bot] 📡 Emitting toggle_ready');
                          botSocket.emit('toggle_ready');
                        }, 1500);

                        resolve();
                      });

                      botSocket.on('connect_error', (error) => {
                        clearTimeout(timeout);
                        console.error('[Bot] ❌ Socket connection error:', error);
                        reject(error);
                      });
                    });

                    botSocket.on('disconnect', (reason) => {
                      console.log('[Bot] ❌ Bot socket disconnected:', botId, reason);
                      // 연결 상태 업데이트
                      const botIndex = botSocketsRef.current.findIndex(b => b.botId === botId);
                      if (botIndex !== -1) {
                        updateBotSocketsList();
                      }
                    });

                    alert(`봇 생성 완료: ${nickname}\nSocket 연결 완료.`);
                  } catch (error) {
                    console.error('[Bot] ❌ Error spawning bot:', error);
                    const errorMessage = error.message || '알 수 없는 오류';
                    alert(`봇 생성 실패: ${errorMessage}\n\n콘솔을 확인하세요.`);
                  }
                }}
                disabled={!roomInfo.code || !roomInfo.roomId}
                className={`w-full px-3 py-2 text-xs rounded text-white font-semibold transition-all ${
                  !roomInfo.code || !roomInfo.roomId
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-700 active:scale-95'
                }`}
              >
                🤖 Spawn Bot (Team B)
              </button>

              <button
                onClick={() => {
                  // Bot shake simulation - 모든 봇이 shake emit
                  // 이 이벤트는 서버로 전송되고, 서버가 score_update를 호스트 Socket으로 브로드캐스트합니다
                  const connectedBots = botSocketsList.filter(b => b.socket?.connected);
                  if (connectedBots.length === 0) {
                    alert('연결된 봇이 없습니다.\n먼저 봇을 생성하고 연결을 확인하세요.');
                    return;
                  }
                  
                  let shakeCount = 0;
                  connectedBots.forEach((bot) => {
                    try {
                      console.log(`[Bot] 📳 Bot ${bot.nickname} (${bot.team}) emitting shake`);
                      bot.socket.emit('shake', { count: 1 });
                      shakeCount++;
                    } catch (error) {
                      console.error(`[Bot] ❌ Bot ${bot.nickname} shake 실패:`, error);
                    }
                  });
                  
                  console.log(`[Bot] 📳 ${shakeCount}개 봇이 Shake 이벤트 전송됨. 서버에서 score_update를 확인하세요.`);
                  if (shakeCount > 0) {
                    alert(`${shakeCount}개 봇이 Shake 이벤트 전송됨\n콘솔에서 Host Socket의 score_update 수신을 확인하세요.`);
                  }
                }}
                disabled={botSocketsList.filter(b => b.socket?.connected).length === 0}
                className={`w-full px-3 py-2 text-xs rounded text-white font-semibold transition-all ${
                  botSocketsList.filter(b => b.socket?.connected).length === 0
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 active:scale-95'
                }`}
              >
                📳 All Bots Shake (실제 서버 이벤트)
              </button>

              <button
                onClick={() => {
                  // 모든 봇 연결 해제
                  botSocketsRef.current.forEach((bot) => {
                    if (bot.socket) {
                      bot.socket.disconnect();
                    }
                  });
                  botSocketsRef.current = [];
                  updateBotSocketsList();
                  alert('모든 봇 연결 해제됨');
                }}
                disabled={botSocketsList.length === 0}
                className={`w-full px-3 py-2 text-xs rounded text-white font-semibold transition-all ${
                  botSocketsList.length === 0
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 active:scale-95'
                }`}
              >
                🗑️ Disconnect All Bots
              </button>
            </div>

            <div className="pt-2 border-t border-gray-700 text-xs">
              <div className="text-gray-400 mb-2">현재 활성 봇: {botSocketsList.length}개</div>
              {botSocketsList.length > 0 && (
                <div className="space-y-2 mt-2">
                  {botSocketsList.map((bot, idx) => (
                    <div key={bot.botId || idx} className={`text-xs p-2 rounded ${
                      bot.team === 'A' ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-cyan-500/20 border border-cyan-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={bot.team === 'A' ? 'text-orange-400 font-semibold' : 'text-cyan-400 font-semibold'}>
                          {bot.nickname}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {bot.socket?.connected ? '✓ 연결됨' : '✗ 연결 끊김'}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => {
                            if (!bot.socket?.connected) {
                              alert('봇이 연결되지 않았습니다.');
                              return;
                            }
                            console.log(`[Bot] 📳 ${bot.nickname} (${bot.team}) emitting shake`);
                            bot.socket.emit('shake', { count: 1 });
                          }}
                          disabled={!bot.socket?.connected}
                          className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                            !bot.socket?.connected
                              ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                              : bot.team === 'A'
                              ? 'bg-orange-600 hover:bg-orange-700 text-white'
                              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          }`}
                        >
                          📳 Shake
                        </button>
                        <button
                          onClick={() => {
                            if (!bot.socket?.connected) {
                              alert('봇이 연결되지 않았습니다.');
                              return;
                            }
                            console.log(`[Bot] 📱 ${bot.nickname} (${bot.team}) emitting sensor_checked`);
                            bot.socket.emit('sensor_checked');
                          }}
                          disabled={!bot.socket?.connected}
                          className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                            !bot.socket?.connected
                              ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                              : bot.team === 'A'
                              ? 'bg-orange-500 hover:bg-orange-600 text-white'
                              : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                          }`}
                        >
                          📱 Sensor
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Flow Test (Middle-Game Bot Simulation) */}
        {activeTab === 4 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">
              중간 게임 플로우 테스트 (Bot 시뮬레이션)
            </div>
            
            <div className="p-2 bg-blue-500/20 border border-blue-500 rounded text-xs text-blue-300 mb-3">
              💡 이 탭은 Cinematic → Tutorial → Casting 플로우를 테스트합니다.<br />
              먼저 Tab 4에서 봇을 생성하세요.
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  // 모든 봇에 대해 sensor_checked emit
                  const connectedBots = botSocketsList.filter(b => b.socket?.connected);
                  if (connectedBots.length === 0) {
                    alert('연결된 봇이 없습니다.\nTab 4에서 봇을 생성하고 연결을 확인하세요.');
                    return;
                  }
                  
                  let sensorCheckCount = 0;
                  connectedBots.forEach((bot) => {
                    try {
                      console.log(`[Flow Test] 📱 Bot ${bot.nickname} (${bot.team}) emitting sensor_checked`);
                      bot.socket.emit('sensor_checked');
                      sensorCheckCount++;
                    } catch (error) {
                      console.error(`[Flow Test] ❌ Bot ${bot.nickname} sensor_checked 실패:`, error);
                    }
                  });
                  
                  console.log(`[Flow Test] 📱 ${sensorCheckCount}개 봇이 sensor_checked 이벤트 전송됨.`);
                  if (sensorCheckCount > 0) {
                    alert(`${sensorCheckCount}개 봇이 센서 확인 이벤트 전송됨\n호스트 UI에서 봇 카드가 초록색으로 변경되는지 확인하세요.`);
                  }
                }}
                disabled={botSocketsList.filter(b => b.socket?.connected).length === 0}
                className={`w-full px-3 py-2 text-xs rounded text-white font-semibold transition-all ${
                  botSocketsList.filter(b => b.socket?.connected).length === 0
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 active:scale-95'
                }`}
              >
                📱 Bot Sensor Check (모든 봇)
              </button>

              <button
                onClick={() => {
                  // 리더인 봇을 찾아서 cast_complete emit
                  const { players } = useGameStore.getState();
                  const allPlayers = [...(players.A || []), ...(players.B || [])];
                  
                  // 리더 찾기
                  const leaderA = allPlayers.find(p => p.team === 'A' && p.isLeader);
                  const leaderB = allPlayers.find(p => p.team === 'B' && p.isLeader);
                  
                  if (!leaderA && !leaderB) {
                    alert('리더가 선택되지 않았습니다.\n먼저 Tutorial 단계에서 리더를 선택하세요.');
                    return;
                  }
                  
                  let castCount = 0;
                  
                  // Team A 리더 봇 찾기
                  if (leaderA) {
                    const botA = botSocketsList.find(b => b.playerId === leaderA.id && b.socket?.connected);
                    if (botA) {
                      try {
                        console.log(`[Flow Test] 🎣 Bot ${botA.nickname} (Team A Leader) emitting cast_complete`);
                        botA.socket.emit('cast_complete', { team: 'A' });
                        castCount++;
                      } catch (error) {
                        console.error(`[Flow Test] ❌ Bot ${botA.nickname} cast_complete 실패:`, error);
                      }
                    } else {
                      console.warn(`[Flow Test] ⚠️ Team A 리더 봇을 찾을 수 없습니다. (playerId: ${leaderA.id})`);
                    }
                  }
                  
                  // Team B 리더 봇 찾기
                  if (leaderB) {
                    const botB = botSocketsList.find(b => b.playerId === leaderB.id && b.socket?.connected);
                    if (botB) {
                      try {
                        console.log(`[Flow Test] 🎣 Bot ${botB.nickname} (Team B Leader) emitting cast_complete`);
                        botB.socket.emit('cast_complete', { team: 'B' });
                        castCount++;
                      } catch (error) {
                        console.error(`[Flow Test] ❌ Bot ${botB.nickname} cast_complete 실패:`, error);
                      }
                    } else {
                      console.warn(`[Flow Test] ⚠️ Team B 리더 봇을 찾을 수 없습니다. (playerId: ${leaderB.id})`);
                    }
                  }
                  
                  if (castCount === 0) {
                    alert('리더 봇을 찾을 수 없습니다.\n리더가 봇이 아니거나 봇이 연결되지 않았습니다.');
                  } else {
                    console.log(`[Flow Test] 🎣 ${castCount}개 팀의 리더 봇이 cast_complete 이벤트 전송됨.`);
                    alert(`${castCount}개 팀의 리더 봇이 캐스팅 완료 이벤트 전송됨\n호스트 UI에서 캐스팅 상태가 업데이트되는지 확인하세요.`);
                  }
                }}
                disabled={botSocketsList.filter(b => b.socket?.connected).length === 0}
                className={`w-full px-3 py-2 text-xs rounded text-white font-semibold transition-all ${
                  botSocketsList.filter(b => b.socket?.connected).length === 0
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
                }`}
              >
                🎣 Bot Cast Complete (리더 봇만)
              </button>

              <div className="pt-2 border-t border-gray-700 text-xs">
                <div className="text-gray-400 mb-2">현재 활성 봇: {botSocketsList.length}개</div>
                <div className="text-gray-500 text-xs">
                  연결된 봇: {botSocketsList.filter(b => b.socket?.connected).length}개
                </div>
                {botSocketsList.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {botSocketsList.map((bot, idx) => {
                      const { players } = useGameStore.getState();
                      const allPlayers = [...(players.A || []), ...(players.B || [])];
                      const player = allPlayers.find(p => p.id === bot.playerId);
                      const isLeader = player?.isLeader || false;
                      
                      return (
                        <div key={bot.botId || idx} className={`text-xs p-1 rounded ${
                          bot.team === 'A' ? 'bg-orange-500/20' : 'bg-cyan-500/20'
                        }`}>
                          <span className={bot.team === 'A' ? 'text-orange-400' : 'text-cyan-400'}>
                            {bot.nickname}
                          </span>
                          {isLeader && <span className="ml-1">👑</span>}
                          <span className="text-gray-400 ml-1">
                            ({bot.socket?.connected ? '연결됨' : '끊김'})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
