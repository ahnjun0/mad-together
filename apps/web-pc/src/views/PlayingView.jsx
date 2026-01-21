import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, Suspense, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { FishingRod3D } from '../components/FishingRod3D';
import { getItemByIndex, RARITY_COLORS, RARITY_BG_COLORS } from '../constants/fishingItems';
import VideoBackground from '../components/VideoBackground';
import WaterSplash from '../components/WaterSplash';
import backgroundOceanVideo from '../assets/background_ocean_flow.mp4';

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
    players,
    gameEndingState,
    setGameEndingPhase,
    closeGameEndingModal,
    setGameState,
  } = useGameStore();

  // Note: PlayingView에서는 requestRoomState를 호출하지 않음
  // 게임 진행 중에는 실시간 score_update 이벤트로 충분함
  // 배경 비디오에 음악이 포함되어 있어 별도 배경음악 제거

  // Calculate goal scores for each team (팀별 인원 * 100점)
  const teamACount = (players.A || []).length;
  const teamBCount = (players.B || []).length;
  const goalScoreA = teamACount * 100;
  const goalScoreB = teamBCount * 100;
  
  // Calculate progress percentage for each team (목표 대비 현재 점수 비율)
  const progressA = goalScoreA > 0 ? Math.min((score.A / goalScoreA) * 100, 100) : 0;
  const progressB = goalScoreB > 0 ? Math.min((score.B / goalScoreB) * 100, 100) : 0;

  // Shake intensity 계산 (팀별)
  const shakeHistoryA = useGameStore((state) => state.shakeHistory.A);
  const shakeHistoryB = useGameStore((state) => state.shakeHistory.B);
  const SHAKE_WINDOW_MS = useGameStore((state) => state.SHAKE_WINDOW_MS);
  const MAX_SHAKES_PER_SECOND = useGameStore((state) => state.MAX_SHAKES_PER_SECOND);

  const intensityA = useMemo(() => {
    if (!shakeHistoryA || shakeHistoryA.length === 0) return 0;
    const now = Date.now();
    const cutoff = now - SHAKE_WINDOW_MS;
    const recentShakes = shakeHistoryA.filter((t) => t >= cutoff);
    const shakesPerSecond = recentShakes.length / (SHAKE_WINDOW_MS / 1000);
    return Math.min(shakesPerSecond / MAX_SHAKES_PER_SECOND, 1);
  }, [shakeHistoryA, SHAKE_WINDOW_MS, MAX_SHAKES_PER_SECOND]);

  const intensityB = useMemo(() => {
    if (!shakeHistoryB || shakeHistoryB.length === 0) return 0;
    const now = Date.now();
    const cutoff = now - SHAKE_WINDOW_MS;
    const recentShakes = shakeHistoryB.filter((t) => t >= cutoff);
    const shakesPerSecond = recentShakes.length / (SHAKE_WINDOW_MS / 1000);
    return Math.min(shakesPerSecond / MAX_SHAKES_PER_SECOND, 1);
  }, [shakeHistoryB, SHAKE_WINDOW_MS, MAX_SHAKES_PER_SECOND]);

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
    console.log('[PlayingView] Score updated:', score, 'Progress - A:', progressA.toFixed(1), '% B:', progressB.toFixed(1), '%');
  }, [score, progressA, progressB]);

  // Debug: Log game ending state
  useEffect(() => {
    if (isEnding) {
      console.log('[PlayingView] Game ending state:', gameEndingState);
    }
  }, [isEnding, gameEndingState]);

  return (
    <div className="w-full h-full relative">
      {/* 비디오 배경 */}
      <VideoBackground videoSrc={backgroundOceanVideo} className="z-0" />
      
      {/* 색상 오버레이 (shake intensity에 따라 팀 컬러로 빛남) */}
      <motion.div
        className="absolute inset-0 z-5 pointer-events-none"
        animate={{
          background: `radial-gradient(circle at 25% 50%, rgba(0, 191, 255, ${intensityA * 0.3}) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(255, 140, 0, ${intensityB * 0.3}) 0%, transparent 50%)`,
        }}
        transition={{ duration: 0.1 }}
      />
      
      {/* 메인 컨텐츠 */}
      <div className="relative z-10 w-full h-full flex flex-col">
      {/* Gauge Bar at Top - 각 팀별 별도 게이지 */}
      <div className="p-4">
        <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-4">
          <div className="flex gap-4">
            {/* Team A Gauge */}
            <div className="flex-1">
              {/* Team A name and score */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold text-cyan-600">
                  {roomInfo.teamAName || 'Team A'}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {score.A} / {goalScoreA}
                </span>
              </div>
              {/* Team A progress bar */}
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressA}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                />
                {/* Percentage display */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-white drop-shadow-md">
                    {progressA.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Team B Gauge */}
            <div className="flex-1">
              {/* Team B name and score */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold text-orange-600">
                  {roomInfo.teamBName || 'Team B'}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {score.B} / {goalScoreB}
                </span>
              </div>
              {/* Team B progress bar */}
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressB}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                />
                {/* Percentage display */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-white drop-shadow-md">
                    {progressB.toFixed(1)}%
                  </span>
                </div>
              </div>
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

            {/* 물보라 파티클 효과 (Team A) */}
            <WaterSplash intensity={intensityA} teamColor="team-a" />

            {/* Ocean overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-blue-600/60 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Center Divider - 물고기 제거, 심플한 구분선만 */}
        <div className="flex flex-col items-center justify-center px-2">
          {/* Rope/line visualization */}
          <div className="w-1 flex-1 bg-gradient-to-b from-gray-400 to-transparent opacity-50" />
          
          {/* 빈 공간 (물고기 제거됨) */}
          <div className="h-4" />

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

            {/* 물보라 파티클 효과 (Team B) */}
            <WaterSplash intensity={intensityB} teamColor="team-b" />

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
    </div>
  );
}
