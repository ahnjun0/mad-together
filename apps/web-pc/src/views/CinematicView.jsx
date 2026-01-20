import { useRef, useState, useEffect } from 'react';
import { usePcSocket } from '../hooks/usePcSocket';
import GlassPanel from '../components/GlassPanel';
import GlossyButton from '../components/GlossyButton';
import cinematicVideo from '../assets/cinematic.mp4';

// PC (Host) only view - Cinematic video playback with game rules overlay
export default function CinematicView() {
  const videoRef = useRef(null);
  const [isSkipped, setIsSkipped] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const { startCasting, terminateGame, isConnected: socketConnected } = usePcSocket();

  useEffect(() => {
    // Video 로드 및 재생 시도
    if (videoRef.current) {
      videoRef.current.load();
      // 사용자 인터랙션 후 오디오 재생을 위해 play() 호출
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // 재생 성공 시 음소거 해제
            videoRef.current.muted = false;
            console.log('[CinematicView] 🎬 Video playing with audio');
          })
          .catch((error) => {
            console.warn('[CinematicView] ⚠️ Video play failed:', error);
            // 브라우저 정책으로 인해 자동 재생이 차단된 경우
            // 사용자가 수동으로 재생해야 할 수 있음
          });
      }
    }
  }, []);

  const handleVideoEnd = () => {
    console.log('[CinematicView] 🎬 Video ended');
    setVideoEnded(true);
    // 비디오 종료 시 CASTING으로 전환
    if (socketConnected) {
      setTimeout(() => {
        startCasting();
      }, 1000); // 1초 후 전환 (사용자가 오버레이를 읽을 시간)
    }
  };

  const handleSkip = () => {
    console.log('[CinematicView] ⏭️ Skip clicked');
    setIsSkipped(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    // Skip 시 즉시 CASTING으로 전환
    if (socketConnected) {
      startCasting();
    }
  };

  const handleVideoError = (e) => {
    console.error('[CinematicView] ❌ Video load error:', e);
    setVideoError(true);
  };

  // 비디오가 끝났거나 스킵된 경우 CASTING으로 전환
  useEffect(() => {
    if ((videoEnded || isSkipped) && socketConnected) {
      // 이미 handleVideoEnd나 handleSkip에서 처리하므로 여기서는 로그만
      console.log('[CinematicView] Transitioning to CASTING...');
    }
  }, [videoEnded, isSkipped, socketConnected]);

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Background Layer: Video를 Background로 배치 */}
      {!videoError ? (
        <div className="fixed inset-0 w-full h-full z-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            className="w-full h-full object-cover"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          >
            <source src={cinematicVideo} type="video/mp4" />
          </video>
        </div>
      ) : (
        <div className="fixed inset-0 w-full h-full z-0 bg-gradient-to-b from-cyan-200 via-cyan-300 to-blue-400">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-4xl mb-6">🚢</p>
              <p className="text-2xl font-bold mb-4">출항하는 배</p>
              <p className="text-gray-300 mb-8">(비디오 파일을 찾을 수 없습니다)</p>
              <GlossyButton onClick={handleSkip} variant="primary">
                건너뛰기
              </GlossyButton>
            </div>
          </div>
        </div>
      )}

      {/* Content Layer (Safe Zone): UI 컨테이너는 중앙에 배치 */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <div className="w-full max-w-[1600px] h-full relative">

          {/* Skip Button (우측 상단, 높은 z-index) */}
          {!videoError && !videoEnded && (
            <button
              onClick={handleSkip}
              className="
                fixed top-4 right-4 z-50
                px-4 py-2 rounded-lg
                bg-black/50 hover:bg-black/70
                text-white font-semibold text-sm
                transition-all backdrop-blur-sm
                border-2 border-white/30
              "
            >
              Skip
            </button>
          )}

          {/* Glassmorphism Overlay (게임 규칙 텍스트) - 가시성 개선: 검정색 테두리와 텍스트 */}
          {!videoError && (
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none w-full max-w-2xl px-6">
              <GlassPanel border="black" className="py-6 px-8 text-center bg-white/95 pointer-events-auto shadow-2xl">
                <div className="space-y-4">
                  <p className="text-xl md:text-2xl font-game text-black leading-relaxed drop-shadow-lg">
                    카운트 다운이 끝나면 힘껏 낚시대(휴대폰)을 던져주세요!
                  </p>
                  <p className="text-lg md:text-xl font-game text-black/90 leading-relaxed drop-shadow-md">
                    이후 HIT! 신호가 오면 팀원이 다함께 휴대폰을 흔들어 물고기를 낚아주세요!
                  </p>
                </div>
              </GlassPanel>
            </div>
          )}

          {/* 비디오 종료 후 전환 안내 (선택사항) */}
          {videoEnded && !isSkipped && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
              <GlassPanel border="black" className="py-6 px-8 text-center bg-white/90">
                <p className="text-2xl font-game text-black mb-4">게임을 시작합니다!</p>
                <p className="text-lg font-game text-black/80">잠시만 기다려주세요...</p>
              </GlassPanel>
            </div>
          )}

          {/* 하단 좌측: 게임 종료 버튼 */}
          <button
            type="button"
            className="
              fixed bottom-4 left-4 px-4 py-2 rounded-lg
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
        </div>
      </div>
    </div>
  );
}
