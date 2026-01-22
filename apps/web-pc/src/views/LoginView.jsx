import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useGameStore } from '../store/useGameStore';
// import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
// import backgroundDeck from '../assets/background_deck.png'; // 이미지 배경 (주석처리)
import backgroundMainVideo from '../assets/background_main.mp4';
// import backgroundOcean from '../assets/sounds/background_ocean.mp3';

const SERVER_URL = import.meta.env.VITE_API_URL || 'https://madcamp.cloud';

export default function LoginView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setAuth, setGameState, restoreRoom, setHost } = useGameStore();

  // 🎵 LoginView 배경음악 (주석처리)
  // useBackgroundMusic(backgroundOcean, {
  //   volume: 0.3,
  //   loop: true,
  //   autoPlay: true,
  // });

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');

    try {
      // 1. Google 토큰으로 서버 인증
      const authRes = await fetch(`${SERVER_URL}/api/auth/login/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (!authRes.ok) {
        throw new Error('Google 인증에 실패했습니다.');
      }

      const authData = await authRes.json();

      // 2. 인증 정보 저장
      setAuth(authData.accessToken, authData.user);

      // 3. 진행 중인 게임 확인
      const activeRoomRes = await fetch(`${SERVER_URL}/api/rooms/active/me`, {
        headers: {
          'Authorization': `Bearer ${authData.accessToken}`,
        },
      });

      if (activeRoomRes.ok) {
        const activeRoomData = await activeRoomRes.json();

        if (activeRoomData.hasActiveRoom && activeRoomData.room) {
          // 기존 게임으로 복귀
          console.log('[LoginView] Restoring active room:', activeRoomData.room.code);
          restoreRoom(activeRoomData.room);
          setHost(true);
          return;
        }
      }

      // 4. 새 게임 생성 화면으로 이동
      setHost(true);
      setGameState('HOME');

    } catch (err) {
      console.error('[LoginView] Error:', err);
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google 로그인에 실패했습니다. 다시 시도해주세요.');
  };

  // ⚡️ [Preloading Logic] - Background video preload
  useEffect(() => {
    const video = document.createElement('video');
    video.src = backgroundMainVideo;
    video.preload = 'auto';
    video.muted = true;
    try {
      video.load();
      console.log('[LoginView] 🎬 Preloading background_main.mp4');
    } catch (e) {
      console.warn('[LoginView] ⚠️ Video preload failed:', e);
    }
    
    return () => {
      video.removeAttribute('src');
      video.load();
    };
  }, []);

  // ⚡️ [Preloading Logic - 주석처리] - Background image preload
  useEffect(() => {
    const img = new Image();
    img.src = backgroundDeck;
    console.log('[LoginView] 🖼️ Preloading background_deck.png');
    
    return () => {
      img.src = '';
    };
  }, []);

  // 개발용 로그인 (DEV 환경에서만)
  const handleDevLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const devToken = `dev-token-host-${Date.now()}`;

      // 개발 모드에서는 가짜 인증 데이터 사용
      setAuth(devToken, {
        id: `dev-user-${Date.now()}`,
        nickname: 'Host (Dev)',
        profileImage: null,
      });

      setHost(true);
      setGameState('HOME');

    } catch (err) {
      setError('개발 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-slate-900 to-cyan-900">
      {/* 비디오 배경 (주석처리 - HomeView에서 사용) */}
      {/* <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={backgroundMainVideo} type="video/mp4" />
      </video> */}

      {/* 오버레이 (주석처리) */}
      {/* <div className="absolute inset-0 bg-black/30 z-[1]" /> */}

      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-10 rounded-3xl shadow-2xl max-w-md w-full mx-4">
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">🎣</div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">
            KaHook!
          </h1>
          <p className="text-blue-200 text-sm">
            호스트로 로그인하세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/70 mt-4">로그인 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_blue"
                shape="pill"
                text="signin_with"
                size="large"
                width="300"
              />
            </div>

            {/* 개발 환경에서만 표시 */}
            {import.meta.env.DEV && (
              <>
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-full border-t border-white/20"></div>
                  <span className="relative px-4 bg-slate-900/50 text-xs text-white/40 rounded">
                    개발 모드
                  </span>
                </div>

                <button
                  onClick={handleDevLogin}
                  className="w-full py-3 bg-slate-700/50 hover:bg-slate-700 border border-white/10 rounded-xl text-white/70 text-sm transition-all"
                >
                  개발용 로그인 (Google 없이)
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-center text-white/30 text-xs mt-8">
          게임 호스트 전용 로그인 화면입니다
        </p>
      </div>
    </div>
  );
}
