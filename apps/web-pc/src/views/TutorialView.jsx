import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';

// PC (Host) only view - Split screen for Tutorial with sensor check
export default function TutorialView() {
  const { players, roomInfo } = useGameStore();
  const { socket, selectLeaders, startCinematic } = usePcSocket();
  const [allSensorsChecked, setAllSensorsChecked] = useState(false);

  // players가 객체 형태로 저장됨: { A: [], B: [], unassigned: [] }
  // Tutorial에서는 unassigned 플레이어를 필터링 (팀이 할당된 플레이어만 표시)
  const teamA_players = Array.isArray(players) 
    ? players.filter(p => p.team === 'A')
    : (players.A || []);
  const teamB_players = Array.isArray(players)
    ? players.filter(p => p.team === 'B')
    : (players.B || []);

  useEffect(() => {
    if (!socket) return;

    const handleAllSensorsChecked = () => {
      console.log('[TutorialView] ✅ All sensors checked');
      setAllSensorsChecked(true);
    };

    const handlePlayerUpdated = (data) => {
      console.log('[TutorialView] 🔄 Player updated:', data);
      // player_updated 이벤트로 sensorChecked 상태가 업데이트됨
      // store가 자동으로 업데이트되므로 리렌더링됨
    };

    const handleLeadersSelected = (data) => {
      console.log('[TutorialView] 👑 Leaders selected, starting cinematic in 3s...', data);
      // 3초 후 시네마틱 시작
      setTimeout(() => {
        startCinematic();
      }, 3000);
    };

    socket.on('all_sensor_checked', handleAllSensorsChecked);
    socket.on('player_updated', handlePlayerUpdated);
    socket.on('leaders_selected', handleLeadersSelected);

    return () => {
      socket.off('all_sensor_checked', handleAllSensorsChecked);
      socket.off('player_updated', handlePlayerUpdated);
      socket.off('leaders_selected', handleLeadersSelected);
    };
  }, [socket, startCinematic]);

  const handleSelectLeaders = () => {
    console.log('[TutorialView] 👑 Selecting leaders');
    selectLeaders();
  };

  // Render player item with sensor check status
  const renderPlayerItem = (player) => (
    <div
      key={player.id || player.playerId}
      className={`p-3 rounded-lg border transition-all ${
        player.sensorChecked
          ? player.team === 'A'
            ? 'bg-green-50 border-green-500 ring-2 ring-green-400 shadow-lg'
            : 'bg-green-50 border-green-500 ring-2 ring-green-400 shadow-lg'
          : player.team === 'A'
          ? 'bg-orange-100 border-orange-300'
          : 'bg-cyan-100 border-cyan-300'
      } ${player.sensorChecked ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-2">
        {player.isLeader && (
          <span className="text-lg" title="팀장">
            👑
          </span>
        )}
        <p className="font-semibold text-gray-800 text-sm">{player.nickname || 'Unknown'}</p>
        {player.sensorChecked ? (
          <span className="ml-auto text-green-600 text-xs font-bold flex items-center gap-1">
            <span className="text-green-500">✓</span> 확인됨
          </span>
        ) : (
          <span className="ml-auto text-gray-400 text-xs">대기 중...</span>
        )}
      </div>
      {player.sensorChecked && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
          <span className="text-xs text-green-600">센서 연결 완료</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex">
      {/* Team B - Left Side */}
      <div className="flex-1 bg-white/90 rounded-r-[20px] border-r-2 border-blue-900 p-8 flex flex-col">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-outline text-white mb-4">
            {roomInfo.teamBName || 'Team B'}
          </h2>
          <div className="text-cyan-500 text-6xl mb-6">🌊</div>
          <p className="text-xl text-gray-700 font-semibold mb-4">
            센서 확인 중...
          </p>
        </div>

        {/* Team B Players List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {teamB_players.length > 0 ? (
              teamB_players.map(renderPlayerItem)
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">플레이어 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="w-1 bg-blue-900"></div>

      {/* Team A - Right Side */}
      <div className="flex-1 bg-white/90 rounded-l-[20px] border-l-2 border-blue-900 p-8 flex flex-col">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-outline text-white mb-4">
            {roomInfo.teamAName || 'Team A'}
          </h2>
          <div className="text-orange-500 text-6xl mb-6">🔥</div>
          <p className="text-xl text-gray-700 font-semibold mb-4">
            센서 확인 중...
          </p>
        </div>

        {/* Team A Players List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {teamA_players.length > 0 ? (
              teamA_players.map(renderPlayerItem)
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">플레이어 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* Select Leaders Button (when all sensors checked) */}
      {allSensorsChecked && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={handleSelectLeaders}
            className="px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-bold text-xl transition-all shadow-lg hover:scale-105"
          >
            👑 리더 선택하기
          </button>
        </div>
      )}
    </div>
  );
}
