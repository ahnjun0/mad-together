// apps/web-pc/src/hooks/useBackgroundMusic.js
import { useEffect, useRef, useCallback } from 'react';

/**
 * 배경음악 재생을 위한 커스텀 훅
 * @param {string} audioSrc - 오디오 파일 경로
 * @param {number} volume - 볼륨 (0.0 ~ 1.0)
 * @param {boolean} loop - 반복 재생 여부
 * @param {boolean} autoPlay - 자동 재생 여부
 */
export function useBackgroundMusic(audioSrc, { volume = 0.5, loop = true, autoPlay = true } = {}) {
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  // 오디오 초기화
  useEffect(() => {
    if (!audioSrc) return;

    // 오디오 객체 생성
    const audio = new Audio(audioSrc);
    audio.loop = loop;
    audio.volume = volume;
    audioRef.current = audio;

    // 오디오 로드 완료 이벤트
    const handleCanPlay = () => {
      console.log(`[Audio] ✅ Loaded: ${audioSrc}`);
    };

    // 오디오 로드 에러 이벤트
    const handleError = (e) => {
      console.error(`[Audio] ❌ Load error: ${audioSrc}`, e);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);

    // 자동 재생
    if (autoPlay) {
      audio.play().catch((err) => {
        console.warn('[Audio] ⚠️ Autoplay prevented (user interaction required):', err);
        // 브라우저 정책상 사용자 상호작용 전에는 재생 불가
      });
      isPlayingRef.current = true;
    }

    // Cleanup
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      isPlayingRef.current = false;
    };
  }, [audioSrc, loop, volume, autoPlay]);

  // 재생
  const play = useCallback(() => {
    if (audioRef.current && !isPlayingRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn('[Audio] Play failed:', err);
      });
      isPlayingRef.current = true;
    }
  }, []);

  // 정지
  const pause = useCallback(() => {
    if (audioRef.current && isPlayingRef.current) {
      audioRef.current.pause();
      isPlayingRef.current = false;
    }
  }, []);

  // 볼륨 조절
  const setVolume = useCallback((newVolume) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  }, []);

  // 정지 및 처음으로
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      isPlayingRef.current = false;
    }
  }, []);

  return {
    play,
    pause,
    stop,
    setVolume,
    audioRef,
  };
}

/**
 * 오디오 파일 프리로딩
 * @param {string[]} audioSources - 프리로드할 오디오 파일 경로 배열
 */
export function useAudioPreload(audioSources = []) {
  useEffect(() => {
    const audioElements = audioSources.map((src) => {
      if (!src) return null;
      
      const audio = new Audio();
      audio.src = src;
      audio.preload = 'auto';
      
      // 메타데이터만 로드 (전체 다운로드 방지)
      audio.load();
      
      console.log(`[Audio Preload] 🔄 Preloading: ${src}`);
      
      return audio;
    }).filter(Boolean);

    // Cleanup
    return () => {
      audioElements.forEach((audio) => {
        audio.src = '';
        audio.load();
      });
    };
  }, [audioSources]);
}
