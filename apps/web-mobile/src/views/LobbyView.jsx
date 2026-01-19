import { useState, useEffect } from 'react';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

export default function LobbyView() {
  const { myTeam, setTeam, isTeamLeader, gameState, players, playerId } = useMobileStore();
  const { selectTeam, toggleReady, sensorChecked } = useMobileSocket();
  const [isReady, setIsReady] = useState(false);
  const [isSensorChecked, setIsSensorChecked] = useState(false);

  // 서버에서 받은 플레이어 정보와 동기화
  useEffect(() => {
    if (playerId && players && Array.isArray(players)) {
      const me = players.find(p => (p.id || p.playerId) === playerId);
      if (me) {
        if (me.isReady !== undefined) setIsReady(me.isReady);
        if (me.sensorChecked !== undefined) setIsSensorChecked(me.sensorChecked);
        if (me.team && me.team !== myTeam) setTeam(me.team);
      }
    }
  }, [players, playerId, myTeam, setTeam]);

  const handleTeamSelect = (team) => {
    setTeam(team);
    selectTeam(team);
  };

  const handleReady = () => {
    setIsReady(!isReady);
    toggleReady();
  };

  // Note: TUTORIAL 상태는 App.jsx에서 InGameView를 렌더링하므로 여기서는 처리하지 않음
  // LobbyView는 WAITING 상태에서만 사용됨 (팀 선택 및 준비 완료)

  return (
    <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-gray-900 overflow-y-auto">
      <div className="w-full max-w-md p-6 space-y-8 flex-1 flex flex-col justify-center">
        
        <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight">
            TEAM SELECT
            </h1>
            <p className="text-gray-400 text-sm font-medium">Choose your side to begin</p>
        </div>

        <div className="space-y-4 w-full">
          <button
            onClick={() => handleTeamSelect('A')}
            className={`w-full py-8 rounded-2xl font-black text-white text-2xl transition-all relative overflow-hidden group ${
              myTeam === 'A'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 scale-105 shadow-xl shadow-orange-500/30 border-4 border-white/20'
                : 'bg-gray-800 hover:bg-gray-700 active:scale-95 border-2 border-gray-700 opacity-80'
            }`}
          >
            <span className="relative z-10">TEAM A 🔥</span>
            {myTeam === 'A' && (
                <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
            )}
          </button>

          <button
            onClick={() => handleTeamSelect('B')}
            className={`w-full py-8 rounded-2xl font-black text-white text-2xl transition-all relative overflow-hidden group ${
              myTeam === 'B'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 scale-105 shadow-xl shadow-cyan-500/30 border-4 border-white/20'
                : 'bg-gray-800 hover:bg-gray-700 active:scale-95 border-2 border-gray-700 opacity-80'
            }`}
          >
            <span className="relative z-10">TEAM B 🌊</span>
            {myTeam === 'B' && (
                <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
            )}
          </button>
        </div>

        <div className={`mt-8 text-center transition-all duration-500 transform ${myTeam ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="bg-gray-800/50 p-6 rounded-3xl border border-gray-700 backdrop-blur-sm">
                <p className="text-gray-300 font-medium mb-4">
                {isTeamLeader ? (
                    <span className="flex items-center justify-center gap-2 text-yellow-400">
                        <span className="text-xl">👑</span> You are the Leader!
                    </span>
                ) : (
                    'Waiting for game to start...'
                )}
                </p>

                <button
                    onClick={handleReady}
                    className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-lg active:scale-95 ${
                        isReady 
                        ? 'bg-green-500 text-white shadow-green-500/40 ring-4 ring-green-500/30' 
                        : 'bg-white text-gray-900 hover:bg-gray-100 shadow-white/10'
                    }`}
                >
                    {isReady ? 'READY! 🚀' : 'READY TO START'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}