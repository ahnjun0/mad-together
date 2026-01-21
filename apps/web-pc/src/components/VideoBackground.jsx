// apps/web-pc/src/components/VideoBackground.jsx
import React, { useEffect, useRef } from 'react';

/**
 * 비디오 배경 컴포넌트
 * @param {string} videoSrc - 비디오 파일 경로
 * @param {string} className - 추가 CSS 클래스
 * @param {string} fallbackImage - 비디오 로딩 실패 시 대체 이미지 (선택)
 * @param {number} volume - 비디오 볼륨 (0.0 ~ 1.0, 기본값: 0.3)
 * @param {boolean} muted - 음소거 여부 (기본값: false)
 */
export default function VideoBackground({ 
  videoSrc, 
  className = '', 
  fallbackImage = null,
  volume = 0.3,
  muted = false 
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 볼륨 설정
    video.volume = muted ? 0 : Math.max(0, Math.min(volume, 1));

    // 비디오 자동 재생 시도 (일부 브라우저는 사용자 인터랙션 필요)
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[VideoBackground] ✅ Video autoplay started');
        })
        .catch((error) => {
          console.warn('[VideoBackground] ⚠️ Autoplay failed:', error);
          // 자동 재생 실패 시 사용자 클릭 시 재생 시도
          const handleUserInteraction = () => {
            video.play().catch(e => console.warn('[VideoBackground] Play on interaction failed:', e));
            document.removeEventListener('click', handleUserInteraction);
          };
          document.addEventListener('click', handleUserInteraction);
        });
    }
  }, [volume, muted]);

  return (
    <div className={`fixed inset-0 w-full h-full overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={muted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ 
          minWidth: '100%', 
          minHeight: '100%',
          objectFit: 'cover'
        }}
        onError={(e) => {
          console.error('[VideoBackground] ❌ Video load error:', e);
        }}
      >
        <source src={videoSrc} type="video/mp4" />
        {fallbackImage && (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${fallbackImage})` }}
          />
        )}
      </video>
    </div>
  );
}
