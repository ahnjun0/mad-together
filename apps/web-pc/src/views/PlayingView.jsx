import { motion } from 'framer-motion';
import { useEffect, Suspense } from 'react';
import { useGameStore } from '../store/useGameStore';
import { FishingRod3D } from '../components/FishingRod3D';
import backgroundOcean from '../assets/background-ocean.png';

// PC (Host) only view - Split screen with two fishing rods
export default function PlayingView() {
  const { score, roomInfo } = useGameStore();

  // Calculate fish position based on score difference (0 = Team B side, 1 = Team A side)
  const totalScore = score.A + score.B;
  const fishPosition = totalScore > 0 ? score.A / totalScore : 0.5;

  // Debug: Log score changes for real-time updates
  useEffect(() => {
    console.log('[PlayingView] Score updated:', score, 'Fish position:', fishPosition);
  }, [score, fishPosition]);

  return (
    <div
      className="w-full h-full flex flex-col bg-gradient-to-b from-sky-400 to-blue-600 bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundOcean})` }}
    >
      {/* Gauge Bar at Top */}
      <div className="p-4">
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-4">
          {/* Team names above gauge */}
          <div className="flex justify-between mb-2 px-2">
            <span className="text-lg font-bold text-cyan-600">
              {roomInfo.teamAName || 'Team A'}
            </span>
            <span className="text-lg font-bold text-orange-600">
              {roomInfo.teamBName || 'Team B'}
            </span>
          </div>

          {/* Gauge bar */}
          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-green-400 to-orange-500 rounded-full"
              initial={{ width: '50%' }}
              animate={{ width: `${fishPosition * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            />

            {/* Fish indicator on gauge */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 text-2xl z-10"
              animate={{ left: `${fishPosition * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              style={{ transform: 'translateX(-50%) translateY(-50%)' }}
            >
              🐟
            </motion.div>

            {/* Percentage display */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-sm font-bold text-white drop-shadow-md">
                {Math.round(fishPosition * 100)}% - {Math.round((1 - fishPosition) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Split Screen Game Area */}
      <div className="flex-1 flex gap-2 px-4 pb-4 min-h-0">
        {/* Team A - Left Side */}
        <div className="flex-1 flex flex-col bg-white/10 rounded-[20px] border-2 border-cyan-400/50 overflow-hidden backdrop-blur-sm">
          {/* Team Header */}
          <div className="p-3 bg-gradient-to-r from-cyan-500/80 to-cyan-400/80 text-center">
            <h2 className="text-2xl font-bold text-white drop-shadow-md">
              {roomInfo.teamAName || 'Team A'}
            </h2>
            <div className="text-4xl font-bold text-white drop-shadow-lg">
              {score.A}
            </div>
          </div>

          {/* 3D Fishing Rod View */}
          <div className="flex-1 relative min-h-0">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-white text-xl animate-pulse">Loading...</div>
                </div>
              }
            >
              <FishingRod3D team="A" />
            </Suspense>

            {/* Ocean overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-blue-600/60 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Center Divider with Fish */}
        <div className="flex flex-col items-center justify-center px-2">
          {/* Rope/line visualization */}
          <div className="w-1 flex-1 bg-gradient-to-b from-gray-400 to-transparent opacity-50" />

          {/* Fish being pulled */}
          <motion.div
            className="text-5xl my-2"
            animate={{
              y: fishPosition > 0.5 ? -20 : fishPosition < 0.5 ? 20 : 0,
              rotate: fishPosition > 0.5 ? -15 : fishPosition < 0.5 ? 15 : 0,
            }}
            transition={{ type: 'spring', stiffness: 50, damping: 10 }}
          >
            🐟
          </motion.div>

          {/* Rope/line visualization */}
          <div className="w-1 flex-1 bg-gradient-to-t from-gray-400 to-transparent opacity-50" />
        </div>

        {/* Team B - Right Side */}
        <div className="flex-1 flex flex-col bg-white/10 rounded-[20px] border-2 border-orange-400/50 overflow-hidden backdrop-blur-sm">
          {/* Team Header */}
          <div className="p-3 bg-gradient-to-r from-orange-400/80 to-orange-500/80 text-center">
            <h2 className="text-2xl font-bold text-white drop-shadow-md">
              {roomInfo.teamBName || 'Team B'}
            </h2>
            <div className="text-4xl font-bold text-white drop-shadow-lg">
              {score.B}
            </div>
          </div>

          {/* 3D Fishing Rod View */}
          <div className="flex-1 relative min-h-0">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-white text-xl animate-pulse">Loading...</div>
                </div>
              }
            >
              <FishingRod3D team="B" />
            </Suspense>

            {/* Ocean overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-blue-600/60 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
