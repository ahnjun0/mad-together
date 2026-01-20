import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import { CastingRod3D } from '../components/CastingRod3D';
import PlayerAvatar from '../components/PlayerAvatar';
import backgroundOnship from '../assets/background_onship.png';
import backgroundOcean from '../assets/background-ocean.png';

// PC (Host) only view - Casting display with animation
export default function CastingView() {
  const { players, roomInfo, castingCountdown, isCastingStarted, castingPower } = useGameStore();
  const { socket, startCountdown, startCastingTimer, terminateGame } = usePcSocket();
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
      className="w-full h-full relative flex items-center justify-center p-8 bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* 중앙 정보 패널 (팀명 / 리더 상태만 간단히) */}
      <div className="w-full max-w-6xl grid grid-cols-2 gap-6 pointer-events-none">
        {/* Team A Section */}
        <div className="bg-white/90 rounded-[20px] border-2 border-orange-500 p-6 flex flex-col">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-outline text-white mb-2">
              {roomInfo.teamAName || 'Team A'}
            </h2>
            <div className="text-orange-500 text-4xl mb-4">🔥</div>
          </div>

          {/* Leader Highlight (텍스트만 간단히 유지) */}
          {leaderA && (
            <p className="mt-4 text-sm text-gray-700 font-game text-center">
              {teamACasted ? '✓ 캐스팅 완료!' : '캐스팅 대기 중...'}
            </p>
          )}
        </div>

        {/* Team B Section */}
        <div className="bg-white/90 rounded-[20px] border-2 border-cyan-500 p-6 flex flex-col">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-outline text-white mb-2">
              {roomInfo.teamBName || 'Team B'}
            </h2>
            <div className="text-cyan-500 text-4xl mb-4">🌊</div>
          </div>

          {/* Leader Highlight (텍스트만 간단히 유지) */}
          {leaderB && (
            <p className="mt-4 text-sm text-gray-700 font-game text-center">
              {teamBCasted ? '✓ 캐스팅 완료!' : '캐스팅 대기 중...'}
            </p>
          )}
        </div>
      </div>

      {/* 바다 위에 직접 보이는 3D 낚싯대 - 화면 전체를 사용하는 레이어 */}
      <div className="absolute inset-x-0 bottom-0 top-24 flex justify-between pointer-events-none px-16">
        <div className="w-1/2 h-full">
          <CastingRod3D team="A" power={castingPower.A || 0} className="w-full h-full" />
        </div>
        <div className="w-1/2 h-full">
          <CastingRod3D team="B" power={castingPower.B || 0} className="w-full h-full" />
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
              '⏳ 서버 카운트다운 진행 중입니다...'}
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

      {/* 하단 좌측: 게임 종료 버튼
      <button
        type="button"
        className="
          absolute bottom-4 left-4 px-4 py-2 rounded-lg
          bg-red-500/80 hover:bg-red-600 text-white font-semibold
          drop-shadow-lg z-50 transition-colors
        "
        onClick={() => {
          if (window.confirm('정말로 게임을 종료하시겠습니까?\n모든 플레이어가 퇴장됩니다.')) {
            terminateGame();
          }
        }}
      >
        게임 종료
      </button> */}
      {/* 하단 좌/우 팀장 아바타 - 화면 확대/축소와 무관하게 고정 위치 */}
      {leaderA && (
        <div className="absolute bottom-6 left-8 z-20 pointer-events-none">
          <PlayerAvatar
            nickname={leaderA.nickname || 'Unknown'}
            sensorChecked={leaderA.sensorChecked || false}
            teamColor="team-a"
            profileImage={leaderA.profileImage}
          />
        </div>
      )}

      {leaderB && (
        <div className="absolute bottom-6 right-8 z-20 pointer-events-none">
          <PlayerAvatar
            nickname={leaderB.nickname || 'Unknown'}
            sensorChecked={leaderB.sensorChecked || false}
            teamColor="team-b"
            profileImage={leaderB.profileImage}
          />
        </div>
      )}
    </div>
  );
}
