import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import backgroundDeck from '../assets/background_deck.png';
import backgroundMainVideo from '../assets/background_main.mp4';

const SERVER_URL = import.meta.env.VITE_API_URL || 'https://madcamp.cloud';

export default function LoginView() {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setAuth, setGameState, setHost } = useGameStore();

  const handleLogin = async (e) => {
    e?.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const authRes = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });

      if (!authRes.ok) {
        throw new Error('로그인에 실패했습니다.');
      }

      const authData = await authRes.json();

      setAuth(authData.accessToken, authData.user);
      setHost(true);
      setGameState('HOME');
    } catch (err) {
      console.error('[LoginView] Error:', err);
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const video = document.createElement('video');
    video.src = backgroundMainVideo;
    video.preload = 'auto';
    video.muted = true;
    try {
      video.load();
    } catch (e) {
      console.warn('[LoginView] ⚠️ Video preload failed:', e);
    }

    const img = new Image();
    img.src = backgroundDeck;

    return () => {
      video.removeAttribute('src');
      video.load();
      img.src = '';
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-slate-900 to-cyan-900">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-10 rounded-3xl shadow-2xl max-w-md w-full mx-4">
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">🎣</div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">
            KaHook!
          </h1>
          <p className="text-blue-200 text-sm">
            호스트 닉네임을 입력하세요
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
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:bg-white/20 transition-all"
            />
            <button
              type="submit"
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-white font-semibold transition-all disabled:opacity-50"
              disabled={!nickname.trim()}
            >
              입장하기
            </button>
          </form>
        )}

        <p className="text-center text-white/30 text-xs mt-8">
          오픈캠퍼스 체험용 로그인 화면입니다
        </p>
      </div>
    </div>
  );
}
