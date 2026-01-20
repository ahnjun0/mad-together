import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';
import { useShake, requestPermission as requestShakePermission } from '../hooks/useShake';
import { useAccelSensor } from '../hooks/useAccelSensor';

export default function InGameView() {
  const { 
    gameState, 
    myTeam, 
    score, 
    isTeamLeader, 
    players, 
    playerId,
    castingCountdown,
    isCastingStarted,
    castingPower,
  } = useMobileStore();
  const { shake, castAction, castComplete, sensorChecked } = useMobileSocket();
  const [permission, setPermission] = useState('prompt'); // prompt, granted, denied
  const [isSensorVerified, setIsSensorVerified] = useState(false); // For local UI feedback in Tutorial
  const [hasCasted, setHasCasted] = useState(false); // Prevent multiple casts
  const [castingMaxPower, setCastingMaxPower] = useState(0); // CASTING 상태에서 shake 동안의 최대 power 추적

  // 서버에서 받은 센서 확인 상태와 동기화
  useEffect(() => {
    if (playerId && players && Array.isArray(players)) {
      const me = players.find(p => (p.id || p.playerId) === playerId);
      if (me && me.sensorChecked !== undefined) {
        setIsSensorVerified(me.sensorChecked);
      }
    }
  }, [players, playerId]);

  // 1. 센서 Hooks
  // Accel (센서 파워 측정용 - CASTING에서 사용)
  const { power: sensorPower, requestPermission: requestAccelPermission } = useAccelSensor();

  // Shake (TUTORIAL + PLAYING용 - 단순 shake 감지)
  const handleShake = useCallback((count) => {
    if (gameState === 'PLAYING') {
      // PLAYING: shake 횟수만 서버로 전송
      shake(count);
    } else if (gameState === 'TUTORIAL') {
      // TUTORIAL: 센서 확인 완료 처리
      if (!isSensorVerified) {
        setIsSensorVerified(true);
        sensorChecked();
        if (navigator.vibrate) navigator.vibrate(200);
      }
    } else if (
      gameState === 'CASTING' &&
      isTeamLeader &&
      permission === 'granted' &&
      isCastingStarted &&
      !hasCasted
    ) {
      // CASTING: shake 감지 시 현재까지 추적한 최대 power로 캐스팅
      const rawPower = castingMaxPower;
      const calcPower = Math.min(rawPower ** 2, 1000);
      const normalizedPower = Math.round(calcPower);

      console.log('[Mobile] 🎣 Casting by first shake', {
        rawPower,
        calcPower,
        normalizedPower,
      });

      setHasCasted(true);

      // 서버로 캐스팅 결과 전송
      castAction(normalizedPower);

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(100);

      // Follow-through 후 cast_complete 전송
      setTimeout(() => {
        castComplete();
      }, 500);
    }
  }, [
    gameState,
    shake,
    sensorChecked,
    isSensorVerified,
    isTeamLeader,
    permission,
    isCastingStarted,
    hasCasted,
    castingMaxPower,
    castAction,
    castComplete,
  ]);
  
  // useShake - 원본 기능만 사용 (shake 감지)
  const { isShaking } = useShake(handleShake, permission);

  // Reset cast state when game state changes (e.g., back to lobby or next game)
  useEffect(() => {
      if (gameState !== 'CASTING') {
          setHasCasted(false);
          setCastingMaxPower(0);
      }
  }, [gameState]);

  // CASTING 상태에서 isShaking 동안 최대 power 추적
  useEffect(() => {
    if (gameState === 'CASTING' && isTeamLeader && isCastingStarted && !hasCasted) {
      if (isShaking) {
        // shake 중일 때 현재 sensorPower가 최대값보다 크면 업데이트
        if (sensorPower > castingMaxPower) {
          setCastingMaxPower(sensorPower);
        }
      }
    }
  }, [gameState, isTeamLeader, isCastingStarted, hasCasted, isShaking, sensorPower, castingMaxPower]);

  // 3. Cinematic Logic
  useEffect(() => {
    if (gameState === 'CINEMATIC') {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    }
  }, [gameState]);

  // 4. Permission Request
  const handleRequestPermission = async () => {
    // iOS 13+ 대응
    const resultShake = await requestShakePermission();
    // useAccelSensor 내부의 permission state도 업데이트해줘야 함 (수동 호출)
    // 하지만 DeviceMotionEvent.requestPermission()은 한번만 호출하면 됨.
    // 여기서는 useAccelSensor가 내부적으로 사용하는 state를 강제로 맞출 수 없으므로
    // useAccelSensor hook도 permission prop을 받도록 수정하는 게 좋음.
    // 현재는 그냥 호출.
    await requestAccelPermission(); 
    
    setPermission(resultShake);
  };

  // 5. Render Logic
  
  // 권한 요청 화면 (최초 1회, 게임 진입 전)
  // Note: WAITING 상태는 App.jsx에서 LobbyView를 렌더링하므로 여기서는 처리하지 않음
  if (permission !== 'granted') {
    return (
       <div className="w-full h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-900 space-y-6 overflow-hidden">
          <div className="text-6xl animate-bounce">👋</div>
          <h2 className="text-white text-2xl font-bold">센서 권한 필요</h2>
          <p className="text-gray-400 text-center text-sm leading-relaxed">
            게임을 즐기기 위해 동작 감지 센서 권한이 필요합니다.<br/>
            (아이폰의 경우 팝업에서 '허용'을 눌러주세요)
          </p>
          <button
            onClick={handleRequestPermission}
            className="w-full py-4 bg-blue-600 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-blue-600/30"
          >
            권한 허용하고 시작하기
          </button>
       </div>
    );
  }

  // 공통 배경 (팀 색상 등)
  const bgColor = myTeam === 'A' ? 'bg-orange-900' : myTeam === 'B' ? 'bg-cyan-900' : 'bg-slate-900';
  const activeColor = myTeam === 'A' ? 'bg-orange-500' : 'bg-cyan-500';

  const isCastingActive = isCastingStarted && !hasCasted;

  return (
    <div className={`w-full h-[100dvh] flex flex-col relative overflow-hidden transition-colors duration-200 ${isShaking ? activeColor : bgColor}`} style={{ touchAction: 'none' }}>
       {/* 상단 정보 */}
       <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none safe-area-top">
          <div className="flex flex-col">
             <span className={`font-black text-2xl drop-shadow-md tracking-tighter ${myTeam === 'A' ? 'text-orange-100' : 'text-cyan-100'}`}>
                TEAM {myTeam}
             </span>
             {isTeamLeader && <span className="text-yellow-400 text-xs font-black bg-black/50 px-2 py-0.5 rounded backdrop-blur-md self-start mt-1">👑 LEADER</span>}
          </div>
          {/* 점수는 PC(Host) 화면에서만 표시 - 모바일은 센서 전송에 집중 */}
       </div>

       {/* 메인 컨텐츠 영역 */}
       <div className="flex-1 flex flex-col items-center justify-center p-6 w-full safe-area-bottom">
          <AnimatePresence mode="wait">
             {gameState === 'CINEMATIC' && (
                <motion.div
                   key="cinematic"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="text-center"
                >
                   <h1 className="text-4xl font-black text-white mb-4 animate-pulse drop-shadow-lg">READY?</h1>
                   <p className="text-white/70 font-medium">꽉 잡으세요!</p>
                </motion.div>
             )}

             {gameState === 'TUTORIAL' && (
                <motion.div
                   key="tutorial"
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="text-center space-y-8 w-full max-w-sm"
                >
                   <div className="w-48 h-48 mx-auto rounded-full border-4 border-white/10 flex items-center justify-center bg-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent"></div>
                      <motion.div
                         animate={{ rotate: [0, -20, 20, 0] }}
                         transition={{ repeat: Infinity, duration: 1.5 }}
                         className="text-7xl relative z-10"
                      >
                         📲
                      </motion.div>
                   </div>
                   <div>
                      <h2 className="text-3xl font-bold text-white mb-2">연습하기</h2>
                      <p className="text-white/60 mb-6">휴대폰을 흔들어보세요!</p>
                      
                      {isSensorVerified ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="px-6 py-3 bg-green-500 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                          >
                              <span>✅</span> 연결 성공!
                          </motion.div>
                      ) : (
                          <div className="text-white/30 text-sm animate-pulse">Waiting for shake...</div>
                      )}
                   </div>
                </motion.div>
             )}

             {gameState === 'CASTING' && (
                <motion.div
                   key="casting"
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="text-center w-full"
                >
                   {isTeamLeader ? (
                      <div className="space-y-8">
                         <div className="text-8xl mb-4 drop-shadow-2xl">🎣</div>
                         <h2 className="text-4xl font-black text-white leading-tight drop-shadow-lg">
                            {hasCasted ? "NICE CAST!" : isCastingActive ? "지금 힘껏 던지세요!" : "곧 캐스팅 시작!"}
                         </h2>
                         <div className="mt-2 text-white/80 font-mono">
                           {typeof castingCountdown === 'number' && !isCastingActive && !hasCasted && (
                             <div className="text-5xl font-black text-yellow-300 drop-shadow-lg">
                               {castingCountdown}
                             </div>
                           )}
                         </div>
                         {!hasCasted && (
                             <p className="text-yellow-300 font-bold animate-bounce bg-black/30 inline-block px-4 py-2 rounded-lg">
                                {isCastingActive ? "폰을 크게 휘둘러 power를 모아요!" : "서버 카운트다운을 기다렸다가 던지세요!"}
                             </p>
                         )}
                         {/* Power Gauge (Debug용, 실시간 센서 power 시각화) */}
                         <div className="w-full max-w-xs mx-auto h-6 bg-black/40 rounded-full overflow-hidden mt-8 border-2 border-white/10 p-1">
                            <motion.div 
                               className="h-full bg-gradient-to-r from-yellow-400 to-red-500 rounded-full"
                               style={{ width: `${Math.min((sensorPower / 2) || 0, 100)}%` }}
                            />
                         </div>
                      </div>
                   ) : (
                      <div className="space-y-6 text-white/60">
                         <div className="text-6xl mb-4 opacity-50 animate-pulse">👀</div>
                         <div>
                            <p className="text-2xl font-bold text-white mb-2">팀장이 캐스팅 중</p>
                            <p className="text-sm opacity-70">
                              {typeof castingCountdown === 'number'
                                ? `서버 카운트다운 ${castingCountdown}초...`
                                : '잠시만 기다려주세요...'}
                            </p>
                         </div>
                      </div>
                   )}
                </motion.div>
             )}

             {gameState === 'PLAYING' && (
                <motion.div
                   key="playing"
                   className="text-center w-full h-full flex flex-col items-center justify-center"
                >
                   <motion.div
                      animate={{ scale: isShaking ? 1.3 : 1, rotate: isShaking ? [0, -10, 10, 0] : 0 }}
                      className="text-9xl mb-10 filter drop-shadow-2xl"
                   >
                      🐟
                   </motion.div>
                   <h2 className="text-5xl font-black text-white italic tracking-tighter drop-shadow-lg animate-pulse">
                      SHAKE!!
                   </h2>
                   <p className="text-white/50 mt-4 font-medium">더 빠르게 흔드세요!</p>
                </motion.div>
             )}
             
             {gameState === 'FINISHED' && (
                <motion.div
                    key="finished"
                    className="text-center space-y-6"
                >
                    <div className="text-6xl">🏁</div>
                    <div>
                        <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
                        <p className="text-white/60 font-medium">결과를 확인하세요</p>
                    </div>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
}