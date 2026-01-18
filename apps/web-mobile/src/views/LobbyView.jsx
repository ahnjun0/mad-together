import { useState } from 'react';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

export default function LobbyView() {
  const { myTeam, setTeam, isTeamLeader, gameState } = useMobileStore();
  const { selectTeam, toggleReady, sensorChecked } = useMobileSocket();
  const [isReady, setIsReady] = useState(false);
  const [isSensorChecked, setIsSensorChecked] = useState(false);

  const handleTeamSelect = (team) => {
    setTeam(team);
    selectTeam(team);
  };

  const handleReady = () => {
    setIsReady(!isReady);
    toggleReady();
  };

  const handleSensorCheck = () => {
      // 실제 센서 로직은 별도 hook이나 컴포넌트에서 처리하겠지만,
      // 여기서는 버튼으로 시뮬레이션
      setIsSensorChecked(true);
      sensorChecked();
  };

  if (gameState === 'TUTORIAL') {
      return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900">
            <div className="text-center space-y-6">
                <h1 className="text-2xl font-bold text-white">센서 확인</h1>
                <p className="text-gray-300">핸드폰을 흔들어주세요!</p>
                {/* 실제로는 흔들림 감지 시 자동 호출되도록 구현해야 함 */}
                <button 
                    onClick={handleSensorCheck}
                    disabled={isSensorChecked}
                    className={`px-8 py-4 rounded-xl font-bold text-xl ${
                        isSensorChecked ? 'bg-green-600 text-white' : 'bg-blue-600 text-white animate-pulse'
                    }`}
                >
                    {isSensorChecked ? '확인 완료!' : '센서 테스트 (터치)'}
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          팀 선택
        </h1>

        <div className="space-y-4">
          <button
            onClick={() => handleTeamSelect('A')}
            className={`w-full py-6 rounded-lg font-bold text-white text-xl transition-all ${
              myTeam === 'A'
                ? 'bg-orange-500 scale-105 shadow-lg shadow-orange-500/50'
                : 'bg-orange-400/20 hover:bg-orange-400/40 active:scale-95 border-2 border-orange-500'
            }`}
          >
            Team A
          </button>

          <button
            onClick={() => handleTeamSelect('B')}
            className={`w-full py-6 rounded-lg font-bold text-white text-xl transition-all ${
              myTeam === 'B'
                ? 'bg-cyan-500 scale-105 shadow-lg shadow-cyan-500/50'
                : 'bg-cyan-400/20 hover:bg-cyan-400/40 active:scale-95 border-2 border-cyan-500'
            }`}
          >
            Team B
          </button>
        </div>

        {myTeam && (
          <div className="mt-8 text-center animate-fade-in space-y-4">
            <p className="text-gray-400">
              {isTeamLeader ? '당신은 팀장입니다! 잠시 후 게임이 시작됩니다.' : '팀 선택 완료!'}
            </p>
            <div className={`inline-block px-6 py-3 rounded-full ${
              myTeam === 'A' ? 'bg-orange-500' : 'bg-cyan-500'
            } text-white font-bold mb-4`}>
              Team {myTeam} 선택됨
            </div>

            <button
                onClick={handleReady}
                className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${
                    isReady 
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/50' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
                {isReady ? '준비 완료!' : '준비 하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}