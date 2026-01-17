import { motion } from 'framer-motion';
import { useMobileStore } from '../store/useMobileStore';

export default function ResultView() {
  const { score, myTeam } = useMobileStore();
  const winner = score.A > score.B ? 'A' : score.A < score.B ? 'B' : null;
  const isWinner = winner === myTeam;

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-md space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            {isWinner ? '🎉 승리!' : winner ? '😢 패배' : '🤝 무승부'}
          </h1>
        </motion.div>

        <div className="space-y-4">
          {/* Team A Score */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-6 rounded-lg ${
              winner === 'A' ? 'bg-orange-500' : 'bg-gray-800'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-xl">Team A</span>
              <span className="text-white font-bold text-2xl">{score.A}pt</span>
            </div>
          </motion.div>

          {/* Team B Score */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-6 rounded-lg ${
              winner === 'B' ? 'bg-cyan-500' : 'bg-gray-800'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-xl">Team B</span>
              <span className="text-white font-bold text-2xl">{score.B}pt</span>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 text-center text-gray-400">
          <p>게임이 종료되었습니다</p>
        </div>
      </div>
    </div>
  );
}
