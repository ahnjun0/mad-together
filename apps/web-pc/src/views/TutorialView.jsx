import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import SplitScreen from '../components/SplitScreen';
import GlassPanel from '../components/GlassPanel';
import GlossyButton from '../components/GlossyButton';
import PlayerAvatar from '../components/PlayerAvatar';
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

    const handleLeadersSelected = (data) => {
      console.log('[TutorialView] 👑 Leaders selected:', data);
      // usePcSocket에서 이미 처리하므로 여기서는 로그만 출력
    };

    socket.on('player_updated', handlePlayerUpdated);
    socket.on('leaders_selected', handleLeadersSelected);

    return () => {
      socket.off('player_updated', handlePlayerUpdated);
      socket.off('leaders_selected', handleLeadersSelected);
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
      {/* 팀 이름 패널: 화면 가로 기준 1/4 지점에 고정 (각 팀의 중앙선) */}
      <div className="fixed left-[25%] top-8 -translate-x-1/2 z-30">
        <GlassPanel border="team-a" className="px-6 py-3">
          <h2 className="text-4xl md:text-5xl font-game text-team-a text-center drop-shadow-lg whitespace-nowrap">
            {roomInfo.teamAName || 'TEAM A'}
          </h2>
        </GlassPanel>
      </div>

      {/* 플레이어 아바타 리스트 - 5열 그리드, 그리드 중앙이 팀의 중앙선(1/4)에 고정 */}
      <div className="fixed left-[25%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        {teamA_players.length > 0 ? (
          <div className="grid grid-cols-5 gap-4">
            {teamA_players.map((player) => (
              <PlayerAvatar
                key={player.id || player.playerId}
                nickname={player.nickname}
                sensorChecked={player.sensorChecked}
                teamColor="team-a"
                profileImage={player.profileImage}
              />
            ))}
          </div>
        ) : (
          <div className="text-white/60 font-game text-lg text-center">
            대기 중...
          </div>
        )}
      </div>
    </div>
  );

  // Team B 컨텐츠
  const teamBContent = (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      {/* 팀 이름 패널: 화면 가로 기준 3/4 지점에 고정 (각 팀의 중앙선) */}
      <div className="fixed left-[75%] top-8 -translate-x-1/2 z-30">
        <GlassPanel border="team-b" className="px-6 py-3">
          <h2 className="text-4xl md:text-5xl font-game text-team-b text-center drop-shadow-lg whitespace-nowrap">
            {roomInfo.teamBName || 'TEAM B'}
          </h2>
        </GlassPanel>
      </div>

      {/* 플레이어 아바타 리스트 - 5열 그리드, 그리드 중앙이 팀의 중앙선(3/4)에 고정 */}
      <div className="fixed left-[75%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        {teamB_players.length > 0 ? (
          <div className="grid grid-cols-5 gap-4">
            {teamB_players.map((player) => (
              <PlayerAvatar
                key={player.id || player.playerId}
                nickname={player.nickname}
                sensorChecked={player.sensorChecked}
                teamColor="team-b"
                profileImage={player.profileImage}
              />
            ))}
          </div>
        ) : (
          <div className="text-white/60 font-game text-lg text-center">
            대기 중...
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Background Layer: 항상 화면 전체를 꽉 채움 */}
      <div 
        className="fixed inset-0 w-full h-full z-0 bg-[#AEE2FF] bg-cover bg-[center_bottom]"
        style={{ 
          backgroundImage: `url(${bgOnship})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Content Layer (Safe Zone): UI 컨테이너는 중앙에 배치 */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <div className="w-full max-w-[1600px] h-full relative">
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
          <div className="w-full h-full">
            <SplitScreen leftContent={teamAContent} rightContent={teamBContent} />
          </div>

          {/* 하단 중앙: Instruction Panel or Start Button - 항상 화면 중앙에 고정 */}
          <div className="fixed left-1/2 bottom-8 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
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
      </div>
    </div>
  );
}
