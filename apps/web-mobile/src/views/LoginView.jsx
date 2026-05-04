import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

const SERVER_URL = import.meta.env.VITE_API_URL || 'https://madcamp.cloud';

const PRELOAD_IMAGES = [
  'https://madcamp.cloud/assets/background_deck.png',
];

export default function LoginView() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [isCodePreFilled, setIsCodePreFilled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setToken, setNickname: setStoreNickname } = useMobileStore();
  const { joinRoom } = useMobileSocket();

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/join\/([a-zA-Z0-9]{6})/);
    if (match && match[1]) {
      setCode(match[1].toUpperCase());
      setIsCodePreFilled(true);
    }

    PRELOAD_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();
    const trimmedNickname = nickname.trim();
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError('입장 코드를 입력해주세요.');
      return;
    }
    if (!trimmedNickname) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const authRes = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmedNickname }),
      });

      if (!authRes.ok) throw new Error('로그인에 실패했습니다.');
      const authData = await authRes.json();

      // store에 token 먼저 저장 -> joinRoom이 store에서 token을 읽어 사용
      setToken(authData.accessToken);
      setStoreNickname(authData.user.nickname);

      await joinRoom(trimmedCode.toUpperCase(), authData.user.nickname, null);
    } catch (err) {
      console.error(err);
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
         <div className="absolute top-1/4 left-[-10%] w-[120%] h-40 bg-blue-500 rounded-[100%] blur-3xl animate-pulse" />
         <div className="absolute bottom-1/4 right-[-10%] w-[120%] h-40 bg-cyan-500 rounded-[100%] blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-2xl z-10"
      >
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 drop-shadow-lg">⚓️</div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md tracking-wider">
            KaHook!
          </h1>
          <p className="text-blue-200 text-sm mt-1">승선 신고서를 작성해주세요</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {!isCodePreFilled && (
            <div className="space-y-2">
              <label className="text-blue-200 text-sm font-bold ml-1">항구 코드 (6자리)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-5 py-4 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-slate-800 transition-all uppercase tracking-widest text-center font-mono text-lg"
              />
            </div>
          )}

          {isCodePreFilled && (
            <div className="text-center p-4 bg-blue-500/20 rounded-xl border border-blue-400/30">
               <p className="text-blue-200 text-sm">입장 코드</p>
               <p className="text-2xl font-mono font-bold text-white tracking-widest">{code}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-blue-200 text-sm font-bold ml-1">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
              className="w-full px-5 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-slate-800 transition-all"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || !nickname.trim() || !code.trim()}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '승선하기'}
          </button>
        </form>
      </motion.div>

      <div className="absolute bottom-4 text-slate-500 text-xs text-center w-full">
        © 2026 KaHook!. All hands on deck.
      </div>
    </div>
  );
}
