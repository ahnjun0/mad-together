import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';

// PC (Host) only view - WaitingView with QR code and team lists
export default function WaitingView() {
  const { roomInfo, players, isConnected } = useGameStore();
  const { startCinematic, joinRoom, isConnected: socketConnected } = usePcSocket();

  // 연결 상태 동기화 및 방 재입장 처리
  useEffect(() => {
    // 소켓이 연결되었고 방 정보가 있지만 플레이어가 없으면 방에 재입장
    const allPlayers = [...(players.A || []), ...(players.B || []), ...(players.unassigned || [])];

    if (socketConnected && roomInfo.roomId && allPlayers.length === 0) {
      console.log('[WaitingView] 🔄 Host rejoining room after reconnect...');
      // Host는 Player가 아니므로 playerId 없이 입장 (Observer)
      joinRoom(roomInfo.roomId);
    }
  }, [socketConnected, roomInfo.roomId, players, joinRoom]);

  // players가 객체 형태로 저장됨: { A: [], B: [], unassigned: [] }
  const teamA_players = Array.isArray(players) 
    ? players.filter(p => p.team === 'A')
    : (players.A || []);
  const teamB_players = Array.isArray(players)
    ? players.filter(p => p.team === 'B')
    : (players.B || []);
  const unassignedPlayers = Array.isArray(players)
    ? players.filter(p => !p.team || p.team === null)
    : (players.unassigned || []);

  // Get all players for validation
  const allPlayers = [...teamA_players, ...teamB_players, ...unassignedPlayers];

  // Start Game button disabled conditions
  const isStartDisabled =
    !socketConnected || // 소켓이 연결되지 않음
    allPlayers.length === 0 || // No players
    unassignedPlayers.length > 0 || // Someone hasn't picked a team
    allPlayers.some(p => !p.isReady); // Someone is not Ready

  // Render player item with status indicators
  const renderPlayerItem = (player, showTeam = true) => (
    <div
      key={player.id || player.playerId}
      className={`p-3 rounded-xl border-2 transition-all shadow-sm ${
        player.team === 'A'
          ? 'bg-orange-50 border-orange-200'
          : player.team === 'B'
          ? 'bg-cyan-50 border-cyan-200'
          : 'bg-white border-gray-200'
      } ${player.sensorChecked ? 'ring-2 ring-green-500' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
           {player.profileImage ? (
               <img src={player.profileImage} alt="Profile" className="w-full h-full object-cover" />
           ) : (
               <span className="text-xl">👤</span>
           )}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                {player.isLeader && (
                <span className="text-lg" title="팀장">
                    👑
                </span>
                )}
                <p className="font-bold text-gray-800 truncate">{player.nickname || 'Unknown'}</p>
            </div>
            {showTeam && player.team && (
                <p className="text-xs text-gray-500 font-medium">Team {player.team}</p>
            )}
        </div>
        
        {player.isReady ? (
          <span className="shrink-0 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg border border-green-200">
            READY
          </span>
        ) : (
          <span className="shrink-0 px-2 py-1 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg">
            WAITING
          </span>
        )}
      </div>
      {player.sensorChecked && (
        <div className="mt-2 flex items-center gap-1 justify-end">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-[10px] text-green-600 font-medium">Sensor OK</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-[100dvh] flex flex-col items-center p-4 md:p-8 bg-slate-50 overflow-y-auto">
      {/* 연결 상태 표시 */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-md transition-colors ${
          socketConnected
            ? 'bg-white text-green-600 border border-green-100'
            : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
          {socketConnected ? 'ONLINE' : 'CONNECTING...'}
        </div>
      </div>

      <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-6 md:mb-8 tracking-tight">
        LOBBY
      </h1>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Team A List (Desktop Left) */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-orange-100 flex flex-col order-2 lg:order-1 h-[400px] lg:h-auto">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-orange-50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                <span className="text-white font-bold text-lg">A</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                {roomInfo.teamAName || 'Team A'}
                </h2>
            </div>
            <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-sm font-bold">
                {teamA_players.length} Players
            </span>
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {teamA_players.length > 0 ? (
              teamA_players.map(p => renderPlayerItem(p, false))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2">
                  <div className="text-4xl opacity-20">🛡️</div>
                  <p className="text-sm font-medium">Waiting for players...</p>
              </div>
            )}
          </div>
        </div>

        {/* Center Panel (QR Code & Unassigned) */}
        <div className="flex flex-col gap-6 order-1 lg:order-2">
            {/* QR Code Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-blue-50 flex flex-col items-center text-center">
                <div className="bg-blue-50 p-4 rounded-2xl mb-4">
                    {roomInfo.qrCode ? (
                    <img
                        src={roomInfo.qrCode}
                        alt="QR Code"
                        className="w-48 h-48 md:w-56 md:h-56 rounded-xl mix-blend-multiply"
                    />
                    ) : (
                    <div className="w-48 h-48 bg-blue-100/50 rounded-xl flex items-center justify-center animate-pulse">
                        <span className="text-blue-300 font-bold">Loading QR...</span>
                    </div>
                    )}
                </div>
                
                <div className="bg-slate-100 px-6 py-2 rounded-xl mb-2">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Room Code</p>
                    <p className="text-3xl font-mono font-black text-slate-800 tracking-widest">
                        {roomInfo.code || '------'}
                    </p>
                </div>
                <p className="text-slate-400 text-sm">Scan to join!</p>
            </div>

            {/* Unassigned Players & Start Button */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col flex-1 min-h-[300px]">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    New Arrivals ({unassignedPlayers.length})
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar min-h-[100px]">
                    {unassignedPlayers.length > 0 ? (
                        unassignedPlayers.map((player) => renderPlayerItem(player, false))
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-300 text-sm italic">
                            All players sorted!
                        </div>
                    )}
                </div>

                <button
                    onClick={() => {
                        console.log('[WaitingView] 🎮 Start Game 버튼 클릭');
                        startCinematic();
                    }}
                    disabled={isStartDisabled}
                    className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all transform active:scale-95 ${
                        isStartDisabled
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:-translate-y-1'
                    }`}
                >
                    START GAME 🚀
                </button>
                {isStartDisabled && (
                    <p className="text-xs text-red-400 mt-3 text-center font-medium">
                        {!socketConnected
                        ? 'Connecting to server...'
                        : allPlayers.length === 0
                        ? 'Waiting for players to join...'
                        : unassignedPlayers.length > 0
                        ? `${unassignedPlayers.length} players need to pick a team!`
                        : 'Waiting for everyone to be READY...'}
                    </p>
                )}
            </div>
        </div>

        {/* Team B List (Desktop Right) */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-cyan-100 flex flex-col order-3 lg:order-3 h-[400px] lg:h-auto">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyan-50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-200">
                <span className="text-white font-bold text-lg">B</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                {roomInfo.teamBName || 'Team B'}
                </h2>
            </div>
            <span className="bg-cyan-50 text-cyan-600 px-3 py-1 rounded-lg text-sm font-bold">
                {teamB_players.length} Players
            </span>
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {teamB_players.length > 0 ? (
              teamB_players.map(renderPlayerItem)
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2">
                  <div className="text-4xl opacity-20">⚔️</div>
                  <p className="text-sm font-medium">Waiting for players...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
