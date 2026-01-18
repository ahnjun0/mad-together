import { useEffect, useRef, useCallback } from 'react';

export function useWakeLock() {
  const wakeLock = useRef(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLock.current = await navigator.wakeLock.request('screen');
        console.log('Screen Wake Lock acquired');
      } catch (err) {
        console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock.current) {
      await wakeLock.current.release();
      wakeLock.current = null;
    }
  }, []);

  useEffect(() => {
    // 앱 시작 시 요청
    requestWakeLock();

    // 탭 전환 후 복귀 시 재요청 (브라우저가 자동으로 해제하기 때문)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);
}
