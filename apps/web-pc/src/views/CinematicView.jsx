import { useRef, useState, useEffect } from 'react';
import { usePcSocket } from '../hooks/usePcSocket';
import cinematicVideo from '../assets/cinematic.mp4';

// PC (Host) only view - Cinematic video playback
export default function CinematicView() {
  const videoRef = useRef(null);
  const [isSkipped, setIsSkipped] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { startTutorial } = usePcSocket();

  useEffect(() => {
    // Video 로드 시도
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  const handleVideoEnd = () => {
    // Video ended - automatically start tutorial
    if (!isSkipped) {
      startTutorial();
    }
  };

  const handleSkip = () => {
    setIsSkipped(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    startTutorial();
  };

  const handleVideoError = (e) => {
    console.error('[Cinematic] Video load error:', e);
    setVideoError(true);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* Video Player or Fallback */}
      {!videoError ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          className="w-full h-full object-cover"
        >
          <source src={cinematicVideo} type="video/mp4" />
        </video>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-cyan-200 via-cyan-300 to-blue-400">
          <div className="text-center text-white">
            <p className="text-4xl mb-6">🚢</p>
            <p className="text-2xl font-bold mb-4">출항하는 배</p>
            <p className="text-gray-300 mb-8">(비디오 파일을 찾을 수 없습니다)</p>
            <button
              onClick={handleSkip}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
            >
              건너뛰기
            </button>
          </div>
        </div>
      )}

      {/* Skip Button (for debugging) */}
      {!videoError && (
        <button
          onClick={handleSkip}
          className="absolute bottom-8 right-8 px-6 py-3 bg-black/50 hover:bg-black/70 text-white rounded-lg font-semibold transition-all backdrop-blur-sm z-10"
        >
          Skip (디버그)
        </button>
      )}
    </div>
  );
}
