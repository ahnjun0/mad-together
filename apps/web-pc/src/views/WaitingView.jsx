import { useGameStore } from '../store/useGameStore';

// PC (Host) only view - WaitingView with QR code and team lists
export default function WaitingView() {
  const { roomInfo, players } = useGameStore();

  // Render player item with status indicators
  const renderPlayerItem = (player) => (
    <div
      key={player.id}
      className={`p-3 rounded-lg border transition-all ${
        player.team === 'A'
          ? 'bg-orange-100 border-orange-300'
          : 'bg-cyan-100 border-cyan-300'
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
      </div>
      {player.sensorChecked && (
        <p className="text-xs text-green-600 mt-1">✓ Sensor Checked</p>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-6xl grid grid-cols-3 gap-6">
        {/* QR Code Center */}
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-8 flex flex-col items-center justify-center">
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
            {players.A && players.A.length > 0 ? (
              players.A.map(renderPlayerItem)
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
            {players.B && players.B.length > 0 ? (
              players.B.map(renderPlayerItem)
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">플레이어 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
