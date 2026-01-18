import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

export default function LobbyView() {
  const { myTeam, setTeam, isTeamLeader } = useMobileStore();
  const { selectTeam } = useMobileSocket();

  const handleTeamSelect = (team) => {
    // Optimistic update
    setTeam(team);
    selectTeam(team);
  };

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
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-gray-400 mb-4">
              {isTeamLeader ? '당신은 팀장입니다! 잠시 후 게임이 시작됩니다.' : '게임 시작을 기다리는 중...'}
            </p>
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