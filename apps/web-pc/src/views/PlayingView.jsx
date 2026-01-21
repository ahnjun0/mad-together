import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, Suspense, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { FishingRod3D } from '../components/FishingRod3D';
import { getItemByIndex, RARITY_COLORS, RARITY_BG_COLORS } from '../constants/fishingItems';
import backgroundOcean from '../assets/background-ocean.png';
import backgroundOceanMusic from '../assets/sounds/background_ocean.mp3';

const ShakeItem = ({ item, onExpire }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onExpire(item.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [item.id, onExpire]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.5 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        scale: 1,
        transition: { 
          type: "spring", 
          stiffness: 500, 
          damping: 30,
          mass: 1,
          delay: 0.15 
        } 
      }}
      exit={{ 
        opacity: 0, 
        scale: 0, 
        transition: { duration: 0.15 } 
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30
      }}
      className="flex flex-col items-center bg-black/30 rounded-lg p-1 min-w-[60px] backdrop-blur-sm border border-white/20"
    >
      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 border-2 border-white mb-1">
        {item.profileImage ? (
          <img src={item.profileImage} alt={item.nickname} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs bg-gray-500 text-white">
            {item.nickname.charAt(0)}
          </div>
        )}
      </div>
      <span className="text-[10px] text-white font-bold truncate max-w-[50px] leading-tight">
        {item.nickname}
      </span>
    </motion.div>
  );
};

const ShakeStream = ({ team }) => {
  const recentShakers = useGameStore((state) => state.recentShakers[team]);
  const removeShaker = useGameStore((state) => state.removeShaker);

  return (
    <div className="flex-1 flex items-center justify-start overflow-hidden h-14 px-2 gap-2 mask-linear-fade">
      <AnimatePresence mode="popLayout">
        {recentShakers.map((shaker) => (
          <ShakeItem
            key={shaker.id}
            item={shaker}
            onExpire={(id) => removeShaker(team, id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// PC (Host) only view - Split screen with two fishing rods
export default function PlayingView() {
  const {
    score,
    roomInfo,
    gameEndingState,
    setGameEndingPhase,
    closeGameEndingModal,
    setGameState,
  } = useGameStore();

  // 🎵 PlayingView 배경음악 (작게 재생)
  useBackgroundMusic(backgroundOceanMusic, {
    volume: 0.2,
    loop: true,
    autoPlay: true,
  });

  // Calculate fish position based on score difference (0 = Team B side, 1 = Team A side)
  const totalScore = score.A + score.B;
  const fishPosition = totalScore > 0 ? score.A / totalScore : 0.5;

  // 게임 종료 상태
  const { isEnding, showModal, winnerTeam, caughtItemIndex, animationPhase } = gameEndingState;
  const caughtItem = getItemByIndex(caughtItemIndex ?? 0);
  const winnerTeamName = winnerTeam === 'A' ? (roomInfo.teamAName || 'A팀') : (roomInfo.teamBName || 'B팀');

  // 승리 애니메이션 완료 시 모달 표시
  const handleVictoryComplete = useCallback(() => {
    if (animationPhase === 'pulling') {
      setGameEndingPhase('modal');
    }
  }, [animationPhase, setGameEndingPhase]);

  // 종료하기 버튼 클릭
  const handleFinish = () => {
    closeGameEndingModal();
    setGameState('FINISHED');
  };

  // Debug: Log score changes for real-time updates
  useEffect(() => {
    console.log('[PlayingView] Score updated:', score, 'Fish position:', fishPosition);
  }, [score, fishPosition]);

  // Debug: Log game ending state
  useEffect(() => {
    if (isEnding) {
      console.log('[PlayingView] Game ending state:', gameEndingState);
    }
  }, [isEnding, gameEndingState]);

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
          <div className="p-3 bg-gradient-to-r from-cyan-500/80 to-cyan-400/80 flex items-center gap-4">
            <div className="flex flex-col items-start min-w-[100px] shrink-0">
              <h2 className="text-2xl font-bold text-white drop-shadow-md truncate max-w-full">
                {roomInfo.teamAName || 'Team A'}
              </h2>
              <div className="text-4xl font-bold text-white drop-shadow-lg leading-none">
                {score.A}
              </div>
            </div>
            {/* Shake Stream Area */}
            <ShakeStream team="A" />
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
              <FishingRod3D
                team="A"
                isEnding={isEnding}
                isWinner={winnerTeam === 'A'}
                onVictoryComplete={handleVictoryComplete}
              />
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
          <div className="p-3 bg-gradient-to-r from-orange-400/80 to-orange-500/80 flex items-center gap-4">
            <div className="flex flex-col items-start min-w-[100px] shrink-0">
              <h2 className="text-2xl font-bold text-white drop-shadow-md truncate max-w-full">
                {roomInfo.teamBName || 'Team B'}
              </h2>
              <div className="text-4xl font-bold text-white drop-shadow-lg leading-none">
                {score.B}
              </div>
            </div>
            {/* Shake Stream Area */}
            <ShakeStream team="B" />
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
              <FishingRod3D
                team="B"
                isEnding={isEnding}
                isWinner={winnerTeam === 'B'}
                onVictoryComplete={handleVictoryComplete}
              />
            </Suspense>

            {/* Ocean overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-blue-600/60 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 게임 종료 결과 모달 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl text-center"
            >
              {/* 승리 팀 표시 */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>

              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                <span className={winnerTeam === 'A' ? 'text-cyan-600' : 'text-orange-600'}>
                  {winnerTeamName}
                </span>
                이(가)
              </h2>

              <p className="text-2xl font-bold text-gray-700 mb-6">
                <span className={RARITY_COLORS[caughtItem.rarity]}>
                  {caughtItem.name}
                </span>
                을(를) 낚았습니다!
              </p>

              {/* 낚은 아이템 이미지 */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
                className={`inline-block text-9xl p-6 rounded-full ${RARITY_BG_COLORS[caughtItem.rarity]} mb-4`}
              >
                {caughtItem.emoji}
              </motion.div>

              <p className="text-gray-500 text-sm mb-8">
                {caughtItem.description}
              </p>

              {/* 종료하기 버튼 */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={handleFinish}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                결과 보기
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
