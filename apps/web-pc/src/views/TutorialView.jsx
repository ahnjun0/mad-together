import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import SplitScreen from '../components/SplitScreen';
import GlassPanel from '../components/GlassPanel';
import GlossyButton from '../components/GlossyButton';
import PlayerAvatar from '../components/PlayerAvatar';

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

  // Team A 컨텐츠
  const teamAContent = (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      {/* 팀 헤더 */}
      <h2 className="text-5xl md:text-6xl font-game text-team-a mb-8 text-center drop-shadow-lg">
        {roomInfo.teamAName || 'TEAM A'}
      </h2>

      {/* 플레이어 아바타 리스트 */}
      <div className="flex flex-wrap gap-6 justify-center items-start">
        {teamA_players.length > 0 ? (
          teamA_players.map((player) => (
            <PlayerAvatar
              key={player.id || player.playerId}
              nickname={player.nickname}
              sensorChecked={player.sensorChecked}
              teamColor="team-a"
              profileImage={player.profileImage}
            />
          ))
        ) : (
          <div className="text-white/60 font-game text-lg">
            대기 중...
          </div>
        )}
      </div>
    </div>
  );

  // Team B 컨텐츠
  const teamBContent = (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      {/* 팀 헤더 */}
      <h2 className="text-5xl md:text-6xl font-game text-team-b mb-8 text-center drop-shadow-lg">
        {roomInfo.teamBName || 'TEAM B'}
      </h2>

      {/* 플레이어 아바타 리스트 */}
      <div className="flex flex-wrap gap-6 justify-center items-start">
        {teamB_players.length > 0 ? (
          teamB_players.map((player) => (
            <PlayerAvatar
              key={player.id || player.playerId}
              nickname={player.nickname}
              sensorChecked={player.sensorChecked}
              teamColor="team-b"
              profileImage={player.profileImage}
            />
          ))
        ) : (
          <div className="text-white/60 font-game text-lg">
            대기 중...
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full relative flex flex-col">
      {/* 상단 연결 상태 배지 */}
      <div className="absolute top-4 right-4 z-50">
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

      {/* SplitScreen: 좌우 팀 패널 */}
      <div className="flex-1">
        <SplitScreen leftContent={teamAContent} rightContent={teamBContent} />
      </div>

      {/* 하단 중앙: Instruction Panel or Start Button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
        {allSensorsChecked ? (
          <GlossyButton
            onClick={handleStartCinematic}
            disabled={!socketConnected}
            variant="primary"
          >
            게임 시작
          </GlossyButton>
        ) : (
          <GlassPanel className="py-4 px-6 text-center bg-white/35">
            <p className="text-lg md:text-xl font-game text-white leading-relaxed">
              휴대폰을 흔들어 센서를 확인하세요
            </p>
            <p className="text-sm md:text-base font-game text-white/90 mt-1">
              아이폰은 권한 허용이 필요합니다.
            </p>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
