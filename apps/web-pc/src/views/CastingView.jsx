import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import { CastingRod3D } from '../components/CastingRod3D';
import backgroundOnship from '../assets/background_onship.png';
import backgroundOcean from '../assets/background-ocean.png';

// PC (Host) only view - Casting display with animation
export default function CastingView() {
  const { players, roomInfo, castingCountdown, isCastingStarted, castingPower } = useGameStore();
  const { socket, startCountdown, startCastingTimer } = usePcSocket();
  const [teamACasted, setTeamACasted] = useState(false);
  const [teamBCasted, setTeamBCasted] = useState(false);
  const [castTriggered, setCastTriggered] = useState(false);
  const [hasCastingTimerStarted, setHasCastingTimerStarted] = useState(false);

  // players가 배열인지 객체인지 확인하고 변환
  const teamA_players = Array.isArray(players) 
    ? players.filter(p => p.team === 'A')
    : (players.A || []);
  const teamB_players = Array.isArray(players)
    ? players.filter(p => p.team === 'B')
    : (players.B || []);

  // Find leaders
  const leaderA = teamA_players.find(p => p.isLeader);
  const leaderB = teamB_players.find(p => p.isLeader);

  useEffect(() => {
    if (!socket) return;

    const handleTeamCasted = (data) => {
      console.log('[CastingView] 🪝 Team casted:', data);
      if (data.team === 'A') {
        setTeamACasted(true);
        setCastTriggered(true);
      } else if (data.team === 'B') {
        setTeamBCasted(true);
        setCastTriggered(true);
      }
    };

    socket.on('team_casted', handleTeamCasted);

    return () => {
      socket.off('team_casted', handleTeamCasted);
    };
  }, [socket]);

  const handleStartCountdown = () => {
    console.log('[CastingView] ⏰ Starting countdown');
    startCountdown();
  };

  const canStartCountdown = teamACasted && teamBCasted;
  const hasBothCasted = canStartCountdown;

  // 선박뷰 ↔ 바다뷰 전환:
  // - 카운트다운/캐스팅 대기 & 캐스팅 완료 후: 선박뷰
  // - 실제 캐스팅 중(낚싯줄이 날아가는 구간): 바다뷰
  const backgroundImage =
    isCastingStarted && !hasBothCasted ? backgroundOcean : backgroundOnship;

  const handleStartCastingTimer = () => {
    console.log('[CastingView] ⏰ Starting casting timer');
    startCastingTimer();
    setHasCastingTimerStarted(true);
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center p-8 bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="w-full max-w-6xl grid grid-cols-2 gap-6">
        {/* Team A Section */}
        <div className="bg-white/90 rounded-[20px] border-2 border-orange-500 p-6 flex flex-col">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-outline text-white mb-2">
              {roomInfo.teamAName || 'Team A'}
            </h2>
            <div className="text-orange-500 text-4xl mb-4">🔥</div>
          </div>

          {/* Leader Highlight */}
          {leaderA && (
            <div className={`p-4 rounded-lg mb-4 transition-all ${
              teamACasted 
                ? 'bg-green-100 border-2 border-green-500 ring-4 ring-green-300' 
                : 'bg-orange-100 border-2 border-orange-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <p className="font-bold text-gray-800">{leaderA.nickname || 'Unknown'}</p>
                  <p className="text-xs text-gray-600 font-game">
                    {teamACasted ? '✓ 캐스팅 완료!' : '캐스팅 대기 중...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Casting Animation / 3D Rod */}
          <div className="relative h-64 bg-cyan-100 rounded-lg overflow-hidden flex items-center justify-center">
            <CastingRod3D team="A" power={castingPower.A || 0} />
          </div>
        </div>

        {/* Team B Section */}
        <div className="bg-white/90 rounded-[20px] border-2 border-cyan-500 p-6 flex flex-col">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-outline text-white mb-2">
              {roomInfo.teamBName || 'Team B'}
            </h2>
            <div className="text-cyan-500 text-4xl mb-4">🌊</div>
          </div>

          {/* Leader Highlight */}
          {leaderB && (
            <div className={`p-4 rounded-lg mb-4 transition-all ${
              teamBCasted 
                ? 'bg-green-100 border-2 border-green-500 ring-4 ring-green-300' 
                : 'bg-cyan-100 border-2 border-cyan-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <p className="font-bold text-gray-800">{leaderB.nickname || 'Unknown'}</p>
                  <p className="text-xs text-gray-600 font-game">
                    {teamBCasted ? '✓ 캐스팅 완료!' : '캐스팅 대기 중...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Casting Animation / 3D Rod */}
          <div className="relative h-64 bg-cyan-100 rounded-lg overflow-hidden flex items-center justify-center">
            <CastingRod3D team="B" power={castingPower.B || 0} />
          </div>
        </div>
      </div>

      {/* Start Casting Timer Button (server-synced, 초기 1회) */}
      {!hasCastingTimerStarted && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleStartCastingTimer}
            className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 rounded-lg text-black font-bold text-xl transition-all shadow-lg hover:scale-105 font-game"
          >
            🎣 Casting 준비 완료
          </motion.button>
        </div>
      )}

      {/* Start Countdown Button (when both teams casted & casting done) */}
      {canStartCountdown && isCastingStarted && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleStartCountdown}
            className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-lg text-white font-bold text-xl transition-all shadow-lg hover:scale-105"
          >
            ⏰ 카운트다운 시작
          </motion.button>
        </div>
      )}

      {/* Status Message */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-black/70 text-white px-6 py-3 rounded-lg backdrop-blur-sm"
        >
          <p className="text-lg font-semibold font-game">
            {!hasCastingTimerStarted &&
              '🎣 Casting을 준비하세요. 카운트다운이 끝나면 힘껏 낚시대(휴대폰)을 던져주세요!'}
            {hasCastingTimerStarted && !isCastingStarted &&
              '⏳ 서버 카운트다운 진행 중입니다...'}ㄹ
            {isCastingStarted && !hasBothCasted &&
              '🚀 팀장이 캐스팅을 진행 중입니다!'}
            {hasBothCasted && isCastingStarted &&
              '✅ 양 팀 모두 캐스팅 완료! 게임 시작 카운트다운을 시작하세요'}
          </p>
        </motion.div>
      </div>

      {/* Center Countdown Display */}
      {typeof castingCountdown === 'number' && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-8 py-4 bg-black/60 rounded-2xl border-2 border-white/40">
            <p className="text-5xl font-black text-white font-game drop-shadow-lg">
              {castingCountdown}
            </p>
            <p className="text-sm text-white/80 text-center mt-1 font-game">
              서버 동기화 캐스팅 카운트다운
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
