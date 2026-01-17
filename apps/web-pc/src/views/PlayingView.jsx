import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

// PC (Host) only view - Progress bar and fish animation
export default function PlayingView() {
  const { score } = useGameStore();

  // Calculate fish position based on score difference (0 = Team B side, 1 = Team A side)
  const totalScore = score.A + score.B;
  const fishPosition = totalScore > 0 ? score.A / totalScore : 0.5;

  return (
    <div className="w-full h-full flex flex-col p-8">
      {/* Gauge Bar at Top */}
      <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-6 mb-6">
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-orange-300 to-orange-500 rounded-full"
            initial={{ width: '50%' }}
            animate={{ width: `${fishPosition * 100}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-700">
              {Math.round(fishPosition * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Game Area with Fish */}
      <div className="flex-1 bg-white/90 rounded-[20px] border-2 border-blue-900 p-8 relative overflow-hidden">
        {/* Ocean background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-200 via-cyan-300 to-blue-400" />

        {/* Team labels */}
        <div className="absolute top-4 left-4 text-xl font-bold text-white text-outline">
          Team B
        </div>
        <div className="absolute top-4 right-4 text-xl font-bold text-white text-outline">
          Team A
        </div>

        {/* Fish with smooth movement */}
        <motion.div
          className="absolute top-1/2 text-6xl"
          animate={{
            left: `${fishPosition * 100}%`,
          }}
          transition={{
            type: 'spring',
            stiffness: 50,
            damping: 10,
          }}
          style={{ transform: 'translateX(-50%) translateY(-50%)' }}
        >
          🐟
        </motion.div>

        {/* Score display */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">Team B</div>
            <div className="text-4xl font-bold text-white text-outline">{score.B}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">Team A</div>
            <div className="text-4xl font-bold text-white text-outline">{score.A}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
