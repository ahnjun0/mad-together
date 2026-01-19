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
      className={`p-3 rounded-xl border-2 transition-all shadow-sm ${
        player.sensorChecked
          ? player.team === 'A'
            ? 'bg-green-50 border-green-400 ring-2 ring-green-300 ring-offset-2'
            : 'bg-green-50 border-green-400 ring-2 ring-green-300 ring-offset-2'
          : player.team === 'A'
          ? 'bg-orange-50 border-orange-200'
          : 'bg-cyan-50 border-cyan-200'
      } ${player.sensorChecked ? 'scale-105 z-10' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
            player.team === 'A' ? 'bg-orange-500 text-white' : 'bg-cyan-500 text-white'
        }`}>
            {player.team}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                {player.isLeader && (
                <span className="text-xl animate-bounce" title="팀장">
                    👑
                </span>
                )}
                <p className="font-bold text-gray-800 truncate">{player.nickname || 'Unknown'}</p>
            </div>
        </div>
        
        {player.sensorChecked ? (
          <div className="flex items-center gap-1.5 bg-green-100 px-2 py-1 rounded-lg border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            <span className="text-green-700 text-xs font-bold">OK</span>
          </div>
        ) : (
          <span className="text-gray-400 text-xs font-medium animate-pulse">Waiting...</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-[100dvh] flex flex-col md:flex-row bg-slate-900 overflow-hidden relative">
      {/* Team B - Left/Top Side */}
      <div className="flex-1 bg-gradient-to-br from-cyan-900 to-slate-900 p-6 md:p-8 flex flex-col relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 text-9xl">🌊</div>
            <div className="absolute bottom-20 right-20 text-8xl">💧</div>
        </div>

        <div className="text-center mb-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-cyan-300 drop-shadow-lg mb-2">
            TEAM B
          </h2>
          <div className="inline-block px-4 py-1 bg-cyan-900/50 rounded-full border border-cyan-500/30">
            <p className="text-cyan-100 font-medium text-sm animate-pulse">
                📲 Check your sensors!
            </p>
          </div>
        </div>

        {/* Team B Players List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-2">
          <div className="space-y-3 max-w-md mx-auto">
            {teamB_players.length > 0 ? (
              teamB_players.map(renderPlayerItem)
            ) : (
              <p className="text-cyan-500/50 text-sm text-center py-10 font-medium italic">No players in Team B</p>
            )}
          </div>
        </div>
      </div>

      {/* Vertical Divider (Desktop) / Horizontal (Mobile) */}
      <div className="h-1 w-full md:w-1 md:h-full bg-slate-700 shadow-2xl z-20 shrink-0"></div>

      {/* Team A - Right/Bottom Side */}
      <div className="flex-1 bg-gradient-to-bl from-orange-900 to-slate-900 p-6 md:p-8 flex flex-col relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-20 right-10 text-9xl">🔥</div>
            <div className="absolute bottom-10 left-20 text-8xl">⚡</div>
        </div>

        <div className="text-center mb-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-orange-300 drop-shadow-lg mb-2">
            TEAM A
          </h2>
          <div className="inline-block px-4 py-1 bg-orange-900/50 rounded-full border border-orange-500/30">
            <p className="text-orange-100 font-medium text-sm animate-pulse">
                📲 Check your sensors!
            </p>
          </div>
        </div>

        {/* Team A Players List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-2">
          <div className="space-y-3 max-w-md mx-auto">
            {teamA_players.length > 0 ? (
              teamA_players.map(renderPlayerItem)
            ) : (
              <p className="text-orange-500/50 text-sm text-center py-10 font-medium italic">No players in Team A</p>
            )}
          </div>
        </div>
      </div>

      {/* Select Leaders Button (Floating) */}
      <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
          allSensorsChecked ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
      }`}>
        <button
          onClick={handleSelectLeaders}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl text-white font-black text-xl transition-all shadow-xl hover:shadow-purple-500/50 hover:scale-105 active:scale-95 flex items-center gap-3 border border-white/20"
        >
          <span>👑</span> SELECT LEADERS
        </button>
      </div>
    </div>
  );
}
