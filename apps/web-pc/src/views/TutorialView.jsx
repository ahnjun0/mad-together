import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import TeamPanel from '../components/TeamPanel';
import GlassPanel from '../components/GlassPanel';
import GlossyButton from '../components/GlossyButton';
import bgOnship from '../assets/background_onship.png';

// PC (Host) only view - Sensor Check Phase
export default function TutorialView() {
  const { players, roomInfo } = useGameStore();
  const { socket, startCinematic, isConnected: socketConnected } = usePcSocket();

  // Host(PC 관리자)는 리스트에서 제외
  const filterNonHost = (list = []) => list.filter((p) => !p.isHost);

  const teamA_players = filterNonHost(players.A || []);
  const teamB_players = filterNonHost(players.B || []);

  // 모든 플레이어의 센서 확인 상태 체크 (Host 제외)
  const allPlayers = [...teamA_players, ...teamB_players];
  const allSensorsChecked = allPlayers.length > 0 && allPlayers.every((p) => p.sensorChecked === true);

  // player_updated 이벤트 리스너 (센서 상태 업데이트 감지)
  useEffect(() => {
    if (!socket) return;

    const handlePlayerUpdated = (data) => {
      console.log('[TutorialView] 🔄 Player updated:', data);
      // store가 자동으로 업데이트되므로 리렌더링됨
    };

    socket.on('player_updated', handlePlayerUpdated);

    return () => {
      socket.off('player_updated', handlePlayerUpdated);
    };
  }, [socket]);

  const handleStartCinematic = () => {
    if (allSensorsChecked && socketConnected) {
      console.log('[TutorialView] 🎬 All sensors checked, starting cinematic...');
      startCinematic();
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 bg-cover bg-center relative"
      style={{ backgroundImage: `url(${bgOnship})` }}
    >
      {/* 상단 연결 상태 배지 */}
      <div className="fixed top-4 right-4 z-50">
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
            socketConnected
              ? 'bg-green-100/90 text-green-800'
              : 'bg-red-100/90 text-red-800'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              socketConnected ? 'bg-green-500' : 'bg-red-500'
            } animate-pulse`}
          />
          {socketConnected ? '서버 연결됨' : '서버 연결 중...'}
        </div>
      </div>

      {/* 메인 레이아웃: 좌우 팀 패널 */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Team A (왼쪽) */}
        <TeamPanel
          teamName={roomInfo.teamAName || 'TEAM A'}
          players={teamA_players}
          color="team-a"
        />

        {/* Team B (오른쪽) */}
        <TeamPanel
          teamName={roomInfo.teamBName || 'TEAM B'}
          players={teamB_players}
          color="team-b"
        />
      </div>

      {/* 하단 중앙: Instruction Banner + Action Button */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-4">
        {/* Instruction Message Bar */}
        <GlassPanel className="py-4 px-6 text-center bg-white/35">
          <p className="text-lg md:text-xl font-fredoka text-white leading-relaxed">
            휴대폰을 흔들어 센서를 확인해주세요.
          </p>
          <p className="text-sm md:text-base font-fredoka text-white/90 mt-1">
            아이폰은 권한 허용이 필요합니다.
          </p>
        </GlassPanel>

        {/* Host Action Button */}
        <div className="w-full">
          {allSensorsChecked ? (
            <GlossyButton
              onClick={handleStartCinematic}
              disabled={!socketConnected}
              variant="primary"
            >
              Start Cinematic
            </GlossyButton>
          ) : (
            <GlossyButton disabled={true} variant="disabled">
              Waiting for sensors... ({allPlayers.filter((p) => p.sensorChecked).length}/{allPlayers.length})
            </GlossyButton>
          )}
        </div>
      </div>
    </div>
  );
}
