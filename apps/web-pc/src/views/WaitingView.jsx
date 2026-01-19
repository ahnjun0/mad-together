import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';

// PC (Host) only view - WaitingView with QR code and team lists
export default function WaitingView() {
  const { roomInfo, players } = useGameStore();
  const { startCinematic } = usePcSocket();

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
    allPlayers.length === 0 || // No players
    unassignedPlayers.length > 0 || // Someone hasn't picked a team
    allPlayers.some(p => !p.isReady); // Someone is not Ready

  // Render player item with status indicators
  const renderPlayerItem = (player, showTeam = true) => (
    <div
      key={player.id || player.playerId}
      className={`p-3 rounded-lg border transition-all ${
        player.team === 'A'
          ? 'bg-orange-100 border-orange-300'
          : player.team === 'B'
          ? 'bg-cyan-100 border-cyan-300'
          : 'bg-gray-100 border-gray-300'
      } ${player.sensorChecked ? 'ring-2 ring-green-500' : ''}`}
    >
      <div className="flex items-center gap-2">
        {player.isLeader && (
          <span className="text-xl" title="팀장">
            👑
          </span>
        )}
        <p className="font-semibold text-gray-800">{player.nickname || 'Unknown'}</p>
        {player.isReady && (
          <span className="ml-auto text-green-600 text-xs font-bold">✓ Ready</span>
        )}
        {!player.isReady && (
          <span className="ml-auto text-gray-400 text-xs">대기 중...</span>
        )}
      </div>
      {showTeam && player.team && (
        <p className="text-xs text-gray-600 mt-1">Team {player.team}</p>
      )}
      {player.sensorChecked && (
        <p className="text-xs text-green-600 mt-1">✓ Sensor Checked</p>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-6xl grid grid-cols-3 gap-6">
        {/* QR Code Center */}
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-8 flex flex-col">
          <div className="flex flex-col items-center justify-center mb-4">
            <h2 className="text-xl font-bold text-outline text-white mb-4">QR 코드</h2>
            {roomInfo.qrCode ? (
              <img
                src={roomInfo.qrCode}
                alt="QR Code"
                className="w-64 h-64 border-4 border-gray-400 rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center border-4 border-gray-400">
                <span className="text-gray-500 text-sm">QR Code Loading...</span>
              </div>
            )}
            <p className="mt-4 text-sm text-gray-600 font-mono font-bold">
              Code: {roomInfo.code || '---'}
            </p>
            <div className="mt-4 text-xs text-gray-500">
              <p>Team A: {roomInfo.teamAName}</p>
              <p>Team B: {roomInfo.teamBName}</p>
            </div>
          </div>

          {/* Unassigned Players List */}
          <div className="mt-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              Current Users: {allPlayers.length} {unassignedPlayers.length > 0 && `(${unassignedPlayers.length} Selecting Team...)`}
            </h3>
            {unassignedPlayers.length > 0 ? (
              <div className="space-y-2">
                {unassignedPlayers.map((player) => renderPlayerItem(player, false))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs text-center py-2">
                {allPlayers.length === 0 ? '플레이어 없음' : '모든 플레이어가 팀을 선택했습니다'}
              </p>
            )}
          </div>

          {/* Start Game Button */}
          <div className="mt-4 w-full">
            <button
              onClick={() => {
                console.log('[WaitingView] 🎮 Start Game 버튼 클릭');
                startCinematic();
              }}
              disabled={isStartDisabled}
              className={`w-full px-4 py-3 rounded-lg text-white font-semibold text-sm transition-all ${
                isStartDisabled
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 active:scale-95'
              }`}
              title={
                isStartDisabled
                  ? allPlayers.length === 0
                    ? '플레이어가 없습니다'
                    : unassignedPlayers.length > 0
                    ? `${unassignedPlayers.length}명이 팀을 선택하지 않았습니다`
                    : '모든 플레이어가 준비되지 않았습니다'
                  : '게임 시작'
              }
            >
              🎮 Start Game
            </button>
            {isStartDisabled && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                {allPlayers.length === 0
                  ? '플레이어가 없습니다'
                  : unassignedPlayers.length > 0
                  ? `${unassignedPlayers.length}명이 팀을 선택하지 않았습니다`
                  : '모든 플레이어가 준비되지 않았습니다'}
              </p>
            )}
          </div>
        </div>

        {/* Team A List */}
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <h2 className="text-xl font-bold text-outline text-white">
              {roomInfo.teamAName || 'Team A'}
            </h2>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {teamA_players.length > 0 ? (
              teamA_players.map(renderPlayerItem)
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">플레이어 없음</p>
            )}
          </div>
        </div>

        {/* Team B List */}
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <h2 className="text-xl font-bold text-outline text-white">
              {roomInfo.teamBName || 'Team B'}
            </h2>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {teamB_players.length > 0 ? (
              teamB_players.map(renderPlayerItem)
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">플레이어 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
