import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import { CastingRod3D } from '../components/CastingRod3D';
import PlayerAvatar from '../components/PlayerAvatar';
import GlassPanel from '../components/GlassPanel';
import VideoBackground from '../components/VideoBackground';
import backgroundOnship from '../assets/background_onship.png';
import backgroundOceanVideo from '../assets/background_ocean_flow.mp4';
import timerSound from '../assets/sounds/timer_sound.mp3';
import timerEndSound from '../assets/sounds/timer_sound_end.mp3';
import castingHitSound from '../assets/sounds/casting_hit_sound.mp3';
import fishingFloat from '../assets/fishing-float.png';

// PC (Host) only view - Casting display with animation
export default function CastingView() {
  const { players, roomInfo, castingCountdown, isCastingStarted, castingPower } = useGameStore();
  const { socket, startCountdown, startCastingTimer, terminateGame, requestRoomState } = usePcSocket();
  const [teamACasted, setTeamACasted] = useState(false);
  const [teamBCasted, setTeamBCasted] = useState(false);
  const [castTriggered, setCastTriggered] = useState(false);
  const [hasCastingTimerStarted, setHasCastingTimerStarted] = useState(false);
  const [showFloats, setShowFloats] = useState(false); // 낚시찌 표시 여부
  const [showHit, setShowHit] = useState(false); // HIT 효과 표시 여부
  const [showFloatAnimA, setShowFloatAnimA] = useState(false); // Team A 낚시찌 포물선 애니메이션
  const [showFloatAnimB, setShowFloatAnimB] = useState(false); // Team B 낚시찌 포물선 애니메이션
  const tickAudioRef = useRef(null);
  const endAudioRef = useRef(null);
  const hitAudioRef = useRef(null);

  // 화면 마운트 시 최신 플레이어 목록 요청
  // 배경 비디오에 음악이 포함되어 있어 별도 배경음악 제거
  useEffect(() => {
    if (socket && roomInfo.roomId) {
      console.log('[CastingView] 🔄 Requesting latest room state');
      requestRoomState();
    }
  }, [socket, roomInfo.roomId, requestRoomState]);

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
        // Team A 낚시찌 포물선 애니메이션 시작
        setShowFloatAnimA(true);
      } else if (data.team === 'B') {
        setTeamBCasted(true);
        setCastTriggered(true);
        // Team B 낚시찌 포물선 애니메이션 시작
        setShowFloatAnimB(true);
      }
      
      // 양 팀 모두 캐스팅 완료 시 2초 대기 후 선박뷰로 전환
      const bothTeamsCasted = (data.team === 'A' && teamBCasted) || (data.team === 'B' && teamACasted);
      if (bothTeamsCasted) {
        console.log('[CastingView] 🎯 Both teams casted, waiting 2s for float animation');
        // 2초 대기 후 낚시찌 표시 (포물선 애니메이션 완료 시간 확보)
        setTimeout(() => {
          setShowFloats(true);
        }, 2000);
      }
    };

    const handleCastingHit = () => {
      console.log('[CastingView] 🎯 Casting HIT!');
      setShowHit(true);
      
      // HIT 효과음 재생
      if (hitAudioRef.current) {
        hitAudioRef.current.currentTime = 0;
        hitAudioRef.current.play().catch(e => console.warn('[CastingView] Hit sound play failed:', e));
      }
      
      // 0.1초 후 게임 시작 (서버에서 즉시 처리)
      setTimeout(() => {
        console.log('[CastingView] 🎮 Starting game after HIT');
        startCountdown();
      }, 100);
    };

    socket.on('team_casted', handleTeamCasted);
    socket.on('casting_hit', handleCastingHit);

    return () => {
      socket.off('team_casted', handleTeamCasted);
      socket.off('casting_hit', handleCastingHit);
    };
  }, [socket, teamACasted, teamBCasted, startCountdown]);

  // 타이머 및 HIT 효과음 초기화
  useEffect(() => {
    tickAudioRef.current = new Audio(timerSound);
    endAudioRef.current = new Audio(timerEndSound);
    hitAudioRef.current = new Audio(castingHitSound);
  }, []);

  // 캐스팅 카운트다운 변경 시 효과음 재생
  useEffect(() => {
    if (castingCountdown === null || castingCountdown === undefined) return;
    const tickAudio = tickAudioRef.current;
    const endAudio = endAudioRef.current;
    if (!tickAudio || !endAudio) return;

    if (castingCountdown > 0) {
      try {
        tickAudio.currentTime = 0;
        void tickAudio.play();
      } catch (e) {
        console.warn('[CastingView] Failed to play timer tick:', e);
      }
    } else if (castingCountdown === 0) {
      try {
        endAudio.currentTime = 0;
        void endAudio.play();
      } catch (e) {
        console.warn('[CastingView] Failed to play timer end tick:', e);
      }
    }
  }, [castingCountdown]);

  const handleStartCountdown = () => {
    console.log('[CastingView] ⏰ Starting countdown');
    startCountdown();
  };

  const canStartCountdown = teamACasted && teamBCasted;
  const hasBothCasted = canStartCountdown;
  
  // Power에 따른 낚시찌 Y 위치 계산
  // power가 높을수록 더 멀리 던져져서 화면 위쪽(y축 작은 값)에 위치
  const calculateFloatY = (power) => {
    const basePosPercent = 55; // 기본 위치를 더 높임 (선박과 겹치지 않도록)
    const powerOffset = (power / 100) * 10; // 0~10% 변화폭
    // power가 높을수록 위로 (더 멀리 던짐)
    return `${basePosPercent - powerOffset}%`;
  };

  // 선박뷰 ↔ 바다뷰 전환:
  // - 카운트다운/캐스팅 대기 & 캐스팅 완료 후(낚시찌 표시 시): 선박뷰
  // - 실제 캐스팅 중(낚싯줄이 날아가는 구간): 바다뷰
  // showFloats가 true가 되면 선박뷰로 전환 (2초 지연 후)
  const isOceanView = isCastingStarted && !showFloats;

  const handleStartCastingTimer = () => {
    console.log('[CastingView] ⏰ Starting casting timer');
    startCastingTimer();
    setHasCastingTimerStarted(true);
  };

  return (
    <div className="w-full h-full relative">
      {/* 배경 - 조건부 렌더링 (선박뷰 또는 바다뷰) */}
      {isOceanView ? (
        <VideoBackground videoSrc={backgroundOceanVideo} className="z-0" />
      ) : (
        <div 
          className="fixed inset-0 w-full h-full z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundOnship})` }}
        />
      )}
      
      {/* 메인 컨텐츠 */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
      {/* 중앙 정보 패널 제거 (화면을 3D 낚싯대와 배경에 집중) */}

      {/* 바다 위에 직접 보이는 3D 낚싯대 - 화면 전체를 사용하는 레이어 */}
      <div className="absolute inset-x-0 bottom-0 top-24 flex justify-between pointer-events-none px-16">
        <div className="w-1/2 h-full">
          <CastingRod3D team="A" power={castingPower.A || 0} className="w-full h-full" />
        </div>
        <div className="w-1/2 h-full">
          <CastingRod3D team="B" power={castingPower.B || 0} className="w-full h-full" />
        </div>
      </div>

      {/* Casting Power Result Panels - 각 팀 화면 상단 1/4, 3/4 위치 */}
      {typeof castingPower.A === 'number' && (
        <motion.div
          className="absolute top-28 left-[25%] -translate-x-1/2 z-20"
          initial={{ scale: 0.8, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
        >
          <div className="px-4 py-2 rounded-2xl bg-white/90 border-2 border-orange-400 shadow-xl flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="text-sm font-game text-gray-800">
              {roomInfo.teamAName || 'Team A'} Power&nbsp;
              <span className="font-black text-orange-500 text-lg">
                {Math.round(castingPower.A)}
              </span>
            </span>
          </div>
        </motion.div>
      )}

      {typeof castingPower.B === 'number' && (
        <motion.div
          className="absolute top-28 left-[75%] -translate-x-1/2 z-20"
          initial={{ scale: 0.8, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
        >
          <div className="px-4 py-2 rounded-2xl bg-white/90 border-2 border-cyan-400 shadow-xl flex items-center gap-2">
            <span className="text-xl">🌊</span>
            <span className="text-sm font-game text-gray-800">
              {roomInfo.teamBName || 'Team B'} Power&nbsp;
              <span className="font-black text-cyan-500 text-lg">
                {Math.round(castingPower.B)}
              </span>
            </span>
          </div>
        </motion.div>
      )}

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

      {/* Start Countdown Button (선박뷰 전환 후 표시, HIT 전까지만) */}
      {canStartCountdown && showFloats && !showHit && (
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
              '⏳ 카운트다운 진행 중입니다!'}
            {isCastingStarted && !showFloats &&
              '🚀 팀장이 캐스팅을 진행 중입니다!'}
            {showFloats && !showHit &&
              '✅ 양 팀 모두 캐스팅 완료! 입질을 기다리는 중...'}
            {showHit &&
              '🎯 입질이 왔습니다! 게임이 곧 시작됩니다!'}
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
              카운트 다운이 끝나면 휴대폰을 던져주세요!
            </p>
          </div>
        </div>
      )}

      {/* 캐스팅 중 낚시찌 포물선 애니메이션 - 바다뷰에서 낚시대와 함께 날아감 */}
      <AnimatePresence>
        {/* Team A 캐스팅 낚시찌 - 선박뷰 전환 전까지 표시 */}
        {showFloatAnimA && !showFloats && (
          <motion.div
            className="absolute left-[25%] top-[65%] z-30 pointer-events-none"
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.8 }}
            animate={{ 
              x: [0, 50, 100],
              y: [0, -100, -50],
              opacity: [1, 1, 0],
              scale: [0.8, 1, 0.6],
              rotate: [0, 45, 90]
            }}
            transition={{
              duration: 1.5,
              ease: "easeOut",
              times: [0, 0.5, 1]
            }}
            exit={{ opacity: 0 }}
          >
            <img src={fishingFloat} alt="casting float A" className="w-8 h-12 drop-shadow-lg" />
          </motion.div>
        )}

        {/* Team B 캐스팅 낚시찌 - 선박뷰 전환 전까지 표시 */}
        {showFloatAnimB && !showFloats && (
          <motion.div
            className="absolute left-[75%] top-[65%] z-30 pointer-events-none"
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.8 }}
            animate={{ 
              x: [0, -50, -100],
              y: [0, -100, -50],
              opacity: [1, 1, 0],
              scale: [0.8, 1, 0.6],
              rotate: [0, -45, -90]
            }}
            transition={{
              duration: 1.5,
              ease: "easeOut",
              times: [0, 0.5, 1]
            }}
            exit={{ opacity: 0 }}
          >
            <img src={fishingFloat} alt="casting float B" className="w-8 h-12 drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 선박뷰 낚시찌 - 양 팀 캐스팅 완료 후 5초간 흔들림 */}
      <AnimatePresence>
        {showFloats && hasBothCasted && (
          <>
            {/* Team A 낚시찌 - 위치 중앙으로 4% 이동 (25% → 29%) */}
            <motion.div
              className="absolute left-[29%] z-30 pointer-events-none"
              style={{ top: calculateFloatY(castingPower.A || 0) }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: [0, -4, 0, 4, 0], // 위아래 움직임
              }}
              transition={{
                y: {
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut"
                },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 }
              }}
            >
              <img src={fishingFloat} alt="fishing float A" className="w-12 h-16 drop-shadow-lg" />
            </motion.div>

            {/* Team B 낚시찌 - 위치 중앙으로 4% 이동 (75% → 71%) */}
            <motion.div
              className="absolute left-[71%] z-30 pointer-events-none"
              style={{ top: calculateFloatY(castingPower.B || 0) }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: [0, -4, 0, 4, 0], // 위아래 움직임
              }}
              transition={{
                y: {
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut",
                  delay: 0.3 // 약간 시간차
                },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 }
              }}
            >
              <img src={fishingFloat} alt="fishing float B" className="w-12 h-16 drop-shadow-lg" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HIT 효과 패널 - 5초 후 표시 */}
      <AnimatePresence>
        {showHit && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: [0.5, 1.2, 1.0],
                opacity: [0, 1, 1]
              }}
              transition={{ 
                duration: 0.5,
                times: [0, 0.6, 1],
                ease: "easeOut"
              }}
            >
              <GlassPanel className="px-20 py-16" border="white">
                <motion.h1 
                  className="text-9xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]"
                  animate={{ 
                    textShadow: [
                      "0 0 30px rgba(250,204,21,0.8)",
                      "0 0 60px rgba(250,204,21,1)",
                      "0 0 30px rgba(250,204,21,0.8)"
                    ]
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: 1
                  }}
                >
                  HIT!
                </motion.h1>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 우측 상단: 게임 종료 버튼 */}
      <button
        type="button"
        className="
          absolute top-4 right-4 px-4 py-2 rounded-lg
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
      </button>
      
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
    </div>
  );
}
