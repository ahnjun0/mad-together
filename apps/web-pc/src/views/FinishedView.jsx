import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

export default function FinishedView() {
  const { score, gameResult, roomInfo } = useGameStore();
  const winner = score.A > score.B ? 'A' : score.A < score.B ? 'B' : null;

  // Get player scores by team, sorted by score descending
  const teamAPlayers = (gameResult?.playerScores || [])
    .filter(p => p.team === 'A')
    .sort((a, b) => b.score - a.score);

  const teamBPlayers = (gameResult?.playerScores || [])
    .filter(p => p.team === 'B')
    .sort((a, b) => b.score - a.score);

  const mvp = gameResult?.mvp;

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-5xl grid grid-cols-2 gap-6">
        {/* Team A */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className={`bg-white/90 rounded-[20px] border-2 border-blue-900 p-8 ${
            winner === 'A' ? 'ring-4 ring-orange-500' : ''
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {winner === 'A' && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="text-4xl"
              >
                👑
              </motion.div>
            )}
            <h2 className="text-3xl font-bold text-outline text-white">
              {winner === 'A' ? 'Winner' : 'Loser'}
            </h2>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <h3 className="text-2xl font-bold text-orange-600">
              {roomInfo.teamAName || 'Team A'}
            </h3>
          </div>

          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
            <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg">
              <span className="font-semibold text-gray-800 font-game">팀 점수</span>
              <span className="text-2xl font-bold text-orange-600">{score.A}pt</span>
            </div>
            {teamAPlayers.map((player, index) => (
              <div
                key={player.playerId}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  mvp?.playerId === player.playerId
                    ? 'bg-yellow-200 ring-2 ring-yellow-400'
                    : 'bg-orange-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {mvp?.playerId === player.playerId && (
                    <span className="text-lg">🏆</span>
                  )}
                  <span className="font-semibold text-gray-800 font-game">
                    {index + 1}. {player.nickname}
                  </span>
                </div>
                <span className="font-bold text-orange-600">{player.score}pt</span>
              </div>
            ))}
            {teamAPlayers.length === 0 && (
              <div className="text-center text-gray-500 py-4">플레이어 없음</div>
            )}
          </div>
        </motion.div>

        {/* Team B */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className={`bg-white/90 rounded-[20px] border-2 border-blue-900 p-8 ${
            winner === 'B' ? 'ring-4 ring-cyan-500' : ''
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {winner === 'B' && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="text-4xl"
              >
                👑
              </motion.div>
            )}
            <h2 className="text-3xl font-bold text-outline text-white">
              {winner === 'B' ? 'Winner' : 'Loser'}
            </h2>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <h3 className="text-2xl font-bold text-cyan-600">
              {roomInfo.teamBName || 'Team B'}
            </h3>
          </div>

          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
            <div className="flex justify-between items-center p-3 bg-cyan-100 rounded-lg">
              <span className="font-semibold text-gray-800 font-game">팀 점수</span>
              <span className="text-2xl font-bold text-cyan-600">{score.B}pt</span>
            </div>
            {teamBPlayers.map((player, index) => (
              <div
                key={player.playerId}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  mvp?.playerId === player.playerId
                    ? 'bg-yellow-200 ring-2 ring-yellow-400'
                    : 'bg-cyan-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {mvp?.playerId === player.playerId && (
                    <span className="text-lg">🏆</span>
                  )}
                  <span className="font-semibold text-gray-800 font-game">
                    {index + 1}. {player.nickname}
                  </span>
                </div>
                <span className="font-bold text-cyan-600">{player.score}pt</span>
              </div>
            ))}
            {teamBPlayers.length === 0 && (
              <div className="text-center text-gray-500 py-4">플레이어 없음</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
