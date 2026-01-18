import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';
import { useShake, requestPermission as requestShakePermission } from '../hooks/useShake';
import { useAccelSensor } from '../hooks/useAccelSensor';
import LobbyView from './LobbyView';

export default function InGameView() {
  const { gameState, myTeam, score, isTeamLeader } = useMobileStore();
  const { shake, cast } = useMobileSocket();
  const [permission, setPermission] = useState('prompt'); // prompt, granted, denied

  // 1. 센서 Hooks
  // Shake (Playing용)
  const handleShake = useCallback((count) => {
    if (gameState === 'PLAYING' || gameState === 'TUTORIAL') {
      shake(count);
    }
  }, [gameState, shake]);
  
  // useShake 내부적으로 permission 체크를 하지만, 여기서 permission 상태를 넘겨줌
  const { isShaking } = useShake(handleShake, permission);

  // Accel (Casting용) - 이 훅은 내부적으로 permission state를 가짐. 
  // 동기화를 위해 requestPermission 로직을 공유해야 함.
  const { power, requestPermission: requestAccelPermission } = useAccelSensor();

  // 2. Casting Logic
  useEffect(() => {
    // Casting 단계이고, 팀장이며, 권한이 있을 때
    if (gameState === 'CASTING' && isTeamLeader && permission === 'granted') {
      // Threshold 설정 (실제 기기 테스트 필요, 일단 25)
      if (power > 25) {
        cast(power);
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }
  }, [gameState, isTeamLeader, power, permission, cast]);

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
  if (permission !== 'granted') {
    return (
       <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-900 space-y-6">
          <h2 className="text-white text-2xl font-bold">센서 권한 필요</h2>
          <p className="text-gray-400 text-center">
            게임을 즐기기 위해 동작 감지 센서 권한이 필요합니다.
          </p>
          <button
            onClick={handleRequestPermission}
            className="w-full py-4 bg-blue-600 rounded-xl text-white font-bold text-lg active:scale-95 transition-transform"
          >
            권한 허용하고 시작하기
          </button>
       </div>
    );
  }

  // WAITING 상태면 LobbyView 렌더링
  if (gameState === 'WAITING') {
    return <LobbyView />;
  }

  // 공통 배경 (팀 색상 등)
  const bgColor = myTeam === 'A' ? 'bg-orange-900' : myTeam === 'B' ? 'bg-cyan-900' : 'bg-slate-900';
  const activeColor = myTeam === 'A' ? 'bg-orange-500' : 'bg-cyan-500';

  return (
    <div className={`w-full h-full flex flex-col relative overflow-hidden transition-colors duration-200 ${isShaking ? activeColor : bgColor}`}>
       {/* 상단 정보 */}
       <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
          <div className="flex flex-col">
             <span className={`font-bold text-xl drop-shadow-md ${myTeam === 'A' ? 'text-orange-300' : 'text-cyan-300'}`}>
                Team {myTeam}
             </span>
             {isTeamLeader && <span className="text-yellow-400 text-sm font-bold">👑 LEADER</span>}
          </div>
          <div className="text-white font-mono text-xl font-bold bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm">
             {score.A} : {score.B}
          </div>
       </div>

       {/* 메인 컨텐츠 영역 */}
       <div className="flex-1 flex flex-col items-center justify-center p-6 w-full">
          <AnimatePresence mode="wait">
             {gameState === 'CINEMATIC' && (
                <motion.div
                   key="cinematic"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="text-center"
                >
                   <h1 className="text-3xl font-bold text-white mb-4 animate-pulse">출항 준비!</h1>
                   <p className="text-white/70">휴대폰을 꼭 쥐어주세요</p>
                </motion.div>
             )}

             {gameState === 'TUTORIAL' && (
                <motion.div
                   key="tutorial"
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="text-center space-y-8"
                >
                   <div className="w-40 h-40 mx-auto rounded-full border-4 border-white/20 flex items-center justify-center bg-white/5">
                      <motion.div
                         animate={{ rotate: [0, -20, 20, 0] }}
                         transition={{ repeat: Infinity, duration: 1.5 }}
                         className="text-6xl"
                      >
                         📲
                      </motion.div>
                   </div>
                   <div>
                      <h2 className="text-2xl font-bold text-white mb-2">연습하기</h2>
                      <p className="text-white/70">마구 흔들어보세요!</p>
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
                      <div className="space-y-6">
                         <div className="text-6xl mb-4">🎣</div>
                         <h2 className="text-3xl font-bold text-white leading-tight">
                            낚싯대를<br/>던지세요!
                         </h2>
                         <p className="text-yellow-300 font-bold animate-bounce">
                            앞으로 강하게 스윙!
                         </p>
                         {/* Power Gauge (Debug용) */}
                         <div className="w-full max-w-xs mx-auto h-4 bg-black/40 rounded-full overflow-hidden mt-8 border border-white/10">
                            <motion.div 
                               className="h-full bg-gradient-to-r from-yellow-400 to-red-500"
                               style={{ width: `${Math.min(power * 3, 100)}%` }}
                            />
                         </div>
                      </div>
                   ) : (
                      <div className="space-y-4 text-white/60">
                         <div className="text-4xl mb-4 opacity-50">👀</div>
                         <p className="text-lg">팀장이 캐스팅 중입니다...</p>
                         <p className="text-sm opacity-70">잠시만 기다려주세요</p>
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
                      animate={{ scale: isShaking ? 1.2 : 1 }}
                      className="text-8xl mb-8 filter drop-shadow-2xl"
                   >
                      🐟
                   </motion.div>
                   <h2 className="text-4xl font-black text-white uppercase tracking-wider drop-shadow-lg animate-pulse">
                      SHAKE IT!
                   </h2>
                </motion.div>
             )}
             
             {gameState === 'FINISHED' && (
                <motion.div
                    key="finished"
                    className="text-center"
                >
                    <h2 className="text-3xl font-bold text-white mb-4">게임 종료</h2>
                    <p className="text-white/80">PC 화면에서 결과를 확인하세요</p>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
}