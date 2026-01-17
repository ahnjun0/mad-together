import { useMobileStore } from '../store/useMobileStore';

export default function LobbyView() {
  const { myTeam, setTeam } = useMobileStore();

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          팀 선택
        </h1>

        <div className="space-y-4">
          <button
            onClick={() => setTeam('A')}
            className={`w-full py-6 rounded-lg font-bold text-white text-xl transition-all ${
              myTeam === 'A'
                ? 'bg-orange-500 scale-105 shadow-lg shadow-orange-500/50'
                : 'bg-orange-400 hover:bg-orange-500 active:scale-95'
            }`}
          >
            Team A
          </button>

          <button
            onClick={() => setTeam('B')}
            className={`w-full py-6 rounded-lg font-bold text-white text-xl transition-all ${
              myTeam === 'B'
                ? 'bg-cyan-500 scale-105 shadow-lg shadow-cyan-500/50'
                : 'bg-cyan-400 hover:bg-cyan-500 active:scale-95'
            }`}
          >
            Team B
          </button>
        </div>

        {myTeam && (
          <div className="mt-8 text-center">
            <p className="text-gray-400 mb-4">게임 시작을 기다리는 중...</p>
            <div className={`inline-block px-6 py-3 rounded-full ${
              myTeam === 'A' ? 'bg-orange-500' : 'bg-cyan-500'
            } text-white font-bold`}>
              Team {myTeam} 선택됨
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
