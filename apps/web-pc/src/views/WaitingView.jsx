import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import TeamPanel from '../components/TeamPanel';
import QRCodePanel from '../components/QRCodePanel';
import GlassPanel from '../components/GlassPanel';
import GlossyButton from '../components/GlossyButton';
import bgShip from '../assets/background_deck.png';
import bgOnship from '../assets/background_onship.png';
import backgroundOceanVideo from '../assets/background_ocean_flow.mp4';
import backgroundFinishedLeft from '../assets/background_finished_left.png';
import backgroundFinishedRight from '../assets/background_finished_right.png';
import cinematicVideo from '../assets/cinematic.mp4';
import backgroundMusicDeck from '../assets/sounds/background_music_deck.mp3';

// PC (Host) only view - WaitingView with QR code and team lists
export default function WaitingView() {
  const { roomInfo, players } = useGameStore();
  const { startTutorial, joinRoom, terminateGame, kickPlayer, isConnected: socketConnected } = usePcSocket();

  // 🎵 WaitingView 배경음악
  useBackgroundMusic(backgroundMusicDeck, {
    volume: 0.4,
    loop: true,
    autoPlay: true,
  });
  
  // ⚡️ [Preloading Logic]
  // WaitingView에서 이후 단계에 필요한 모든 주요 이미지/영상 자원을 미리 로딩
  useEffect(() => {
    const imageAssets = [
      bgShip,                   // 현재 대기 화면 배경
      bgOnship,                 // Tutorial / Casting 선박 뷰
      backgroundFinishedLeft,   // Finished 화면 배경 (Team A 승리)
      backgroundFinishedRight,  // Finished 화면 배경 (Team B 승리)
    ].filter(Boolean);

    const videoAssets = [
      cinematicVideo,           // CinematicView 영상
      backgroundOceanVideo,     // Casting / Playing 바다 뷰 (동영상)
    ].filter(Boolean);

    // 이미지 프리로드
    const imageElements = imageAssets.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    // 비디오 프리로드
    const videoElements = videoAssets.map((src) => {
      const video = document.createElement('video');
      video.src = src;
      video.preload = 'auto';
      // load()는 브라우저가 허용하는 범위 내에서 메타데이터/일부 버퍼를 미리 가져옴
      try {
        video.load();
      } catch (e) {
        console.warn('[WaitingView] ⚠️ Video preload failed:', e);
      }
      return video;
    });

    // 클린업: 메모리 누수 방지를 위해 참조 해제
    return () => {
      imageElements.forEach((img) => {
        img.src = '';
      });
      videoElements.forEach((video) => {
        video.removeAttribute('src');
        video.load();
      });
    };
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

  // Start Game 버튼 비활성 조건 (강화된 조건)
  const isStartDisabled =
    !socketConnected || // 소켓이 연결되지 않음
    allPlayers.length === 0 || // 플레이어 없음
    unassignedPlayers.length > 0 || // 팀 미선택 인원 존재
    teamA_players.length === 0 || // Team A가 비어있음
    teamB_players.length === 0 || // Team B가 비어있음
    teamA_players.length !== teamB_players.length || // 양 팀 인원이 다름
    allPlayers.some((p) => !p.isReady); // 준비 안 된 인원 존재

  // 플레이어 Kick 핸들러
  const handleKickPlayer = (playerId) => {
    console.log('[WaitingView] 🦵 Kicking player:', playerId);
    kickPlayer(playerId);
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Background Layer: 선착장 이미지 배경 */}
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
              showKickButton={true}
              onKick={handleKickPlayer}
              showPlayerCount={true}
            />
          </div>

          {/* Team B 패널: 좌우 화면 끝으로 조금씩 이동하여 사이즈 키우기 */}
          <div className="fixed left-[80%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[400px]">
            <TeamPanel
              teamName={roomInfo.teamBName || 'TEAM B'}
              players={teamB_players}
              color="team-b"
              showKickButton={true}
              onKick={handleKickPlayer}
              showPlayerCount={true}
            />
          </div>

          {/* 중앙 요소들: 화면 세로 중앙선에 centered */}
          {/* KAHOOK! 타이틀 */}
          <div className="fixed left-1/2 top-20 -translate-x-1/2 z-30">
            <h1
              className="
                text-5xl md:text-6xl font-game text-[#1e3a8a]
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
              <p className="text-2xl md:text-3xl font-game text-white tracking-[0.2em]">
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

          {/* 하단 좌측: 게임 종료 버튼 */}
          <button
            type="button"
            className="
              absolute bottom-4 left-4 px-4 py-2 rounded-lg
              bg-red-500/80 hover:bg-red-600 text-white font-semibold
              drop-shadow-lg z-50 transition-colors
            "
            onClick={() => {
              if (window.confirm('정말로 게임을 종료하시겠습니까?\n모든 플레이어가 퇴장됩니다.')) {
                terminateGame();
              }
            }}
          >
            게임 종료
          </button>

          {/* 하단 우측: Help 버튼 */}
          <button
            type="button"
            className="
              absolute bottom-4 right-4 text-white/80 text-2xl font-game
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
