import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import TeamPanel from '../components/TeamPanel';
import QRCodePanel from '../components/QRCodePanel';
import GlassPanel from '../components/GlassPanel';
import GlossyButton from '../components/GlossyButton';
import bgShip from '../assets/background-ship.jpg';
import bgOnship from '../assets/background_onship.png';

// PC (Host) only view - WaitingView with QR code and team lists
export default function WaitingView() {
  const { roomInfo, players } = useGameStore();
  const { startTutorial, joinRoom, isConnected: socketConnected } = usePcSocket();
  
  // ⚡️ [Preloading Logic]
  // 이 컴포넌트가 마운트되면, 다음 단계 이미지를 브라우저가 미리 다운받게 함
  useEffect(() => {
    const img = new Image();
    img.src = bgOnship;
    // img.onload = () => console.log('Next background loaded'); // 디버깅용
  }, []);

  // 연결 상태 동기화 및 방 재입장 처리
  useEffect(() => {
    const allPlayersRaw = [
      ...(players.A || []),
      ...(players.B || []),
      ...(players.unassigned || []),
    ];

    if (socketConnected && roomInfo.roomId && allPlayersRaw.length === 0) {
      console.log('[WaitingView] 🔄 Host rejoining room after reconnect...');
      // Host는 Player가 아니므로 playerId 없이 입장 (Observer)
      joinRoom(roomInfo.roomId);
    }
  }, [socketConnected, roomInfo.roomId, players, joinRoom]);

  // Host(PC 관리자)는 리스트에서 제외
  const filterNonHost = (list = []) => list.filter((p) => !p.isHost);

  const teamA_players = filterNonHost(players.A || []);
  const teamB_players = filterNonHost(players.B || []);
  const unassignedPlayers = filterNonHost(players.unassigned || []);

  const allPlayers = [...teamA_players, ...teamB_players, ...unassignedPlayers];

  // Start Game 버튼 비활성 조건
  const isStartDisabled =
    !socketConnected || // 소켓이 연결되지 않음
    allPlayers.length === 0 || // 플레이어 없음
    unassignedPlayers.length > 0 || // 팀 미선택 인원 존재
    allPlayers.some((p) => !p.isReady); // 준비 안 된 인원 존재

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Background Layer: 항상 화면 전체를 꽉 채움 */}
      <div 
        className="fixed inset-0 w-full h-full z-0 bg-[#AEE2FF] bg-cover bg-[center_bottom]"
        style={{ 
          backgroundImage: `url(${bgShip})`,
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

          {/* Team A 패널: 좌우 화면 끝으로 조금씩 이동하여 사이즈 키우기 */}
          <div className="fixed left-[20%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[400px]">
            <TeamPanel
              teamName={roomInfo.teamAName || 'TEAM A'}
              players={teamA_players}
              color="team-a"
            />
          </div>

          {/* Team B 패널: 좌우 화면 끝으로 조금씩 이동하여 사이즈 키우기 */}
          <div className="fixed left-[80%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[400px]">
            <TeamPanel
              teamName={roomInfo.teamBName || 'TEAM B'}
              players={teamB_players}
              color="team-b"
            />
          </div>

          {/* 중앙 요소들: 화면 세로 중앙선에 centered */}
          {/* KAHOOK! 타이틀 */}
          <div className="fixed left-1/2 top-20 -translate-x-1/2 z-30">
            <h1
              className="
                text-5xl md:text-6xl font-fredoka text-[#1e3a8a]
                text-outline tracking-[0.18em] drop-shadow-xl whitespace-nowrap
              "
            >
              KAHOOK!
            </h1>
          </div>

          {/* QR 코드 */}
          <div className="fixed left-1/2 top-44 -translate-x-1/2 z-30">
            <QRCodePanel
              qrCodeUrl={roomInfo.qrCode}
              roomCode={roomInfo.code || '---'}
            />
          </div>

          {/* WAITING 패널: GameStart 버튼 위로 일부 여백을 두고 배치 */}
          <div className="fixed left-1/2 bottom-40 -translate-x-1/2 z-30 w-full max-w-xl px-4">
            <GlassPanel className="py-4 text-center bg-white/35">
              <p className="text-2xl md:text-3xl font-fredoka text-white tracking-[0.2em]">
                WAITING...
              </p>
              <p className="mt-2 text-xs md:text-sm font-game text-white/80">
                모든 플레이어가 팀을 선택하고 준비를 완료하면 게임을 시작할 수 있어요.
              </p>
            </GlassPanel>
          </div>

          {/* GAMESTART 버튼: 하단 중앙에 적당한 여백으로 fixed 배치 */}
          <div className="fixed left-1/2 bottom-8 -translate-x-1/2 z-40 w-full max-w-xl px-4">
            <GlossyButton
              onClick={() => {
                console.log('[WaitingView] 🎮 Game Start 버튼 클릭 - Starting Tutorial');
                startTutorial();
              }}
              disabled={isStartDisabled}
              variant="primary"
            >
              GAME START
            </GlossyButton>
          </div>

          {/* 하단 우측: Help 버튼 */}
          <button
            type="button"
            className="
              absolute bottom-4 right-4 text-white/80 text-2xl font-fredoka
              hover:text-white drop-shadow-lg z-50
            "
            onClick={() => {
              // 간단한 도움말 – 추후 별도 모달로 확장 가능
              alert('모든 플레이어가 팀을 선택하고 READY 상태가 되어야 게임을 시작할 수 있습니다.');
            }}
          >
            ?
          </button>
        </div>
      </div>
    </div>
  );
}
