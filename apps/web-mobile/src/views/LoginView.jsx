import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export default function LoginView() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { joinRoom } = useMobileSocket();
  const { setGameState } = useMobileStore();

  const handleJoin = async (targetNickname, token = null) => {
    if (!code.trim()) {
      setError('입장 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await joinRoom(code.toUpperCase(), targetNickname, token);
      setGameState('WAITING');
    } catch (err) {
      console.error(err);
      setError('입장에 실패했습니다. 코드를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevSubmit = (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    handleJoin(nickname, null); // 개발 토큰 자동 생성
  };

  const handleGoogleSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    // 구글 닉네임 사용
    handleJoin(decoded.name, credentialResponse.credential);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 overflow-hidden relative">
      {/* 배경 장식 */}
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
            MAD TOGETHER
          </h1>
          <p className="text-blue-200 text-sm mt-1">승선 신고서를 작성해주세요</p>
        </div>

        <div className="space-y-6">
          {/* 공통 코드 입력 */}
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
          
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center"
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* Google Login Section */}
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google 로그인에 실패했습니다.')}
              theme="filled_blue"
              shape="pill"
              text="signin_with"
              size="large"
              width="100%"
            />
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute w-full border-t border-white/10"></div>
            <span className="relative px-3 bg-transparent text-xs text-blue-200/50 bg-slate-900/50 rounded backdrop-blur">
              OR (개발용 / 닉네임 직접 입력)
            </span>
          </div>

          {/* Dev Login Form */}
          <form onSubmit={handleDevSubmit} className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 입력 (개발용)"
                className="w-full px-5 py-3 bg-slate-800/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-slate-800 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !nickname || !code}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform ${
                loading || !nickname || !code
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                  : 'bg-slate-600 hover:bg-slate-500 active:scale-95'
              }`}
            >
              {loading ? '입장 중...' : '닉네임으로 입장'}
            </button>
          </form>
        </div>
      </motion.div>
      
      <div className="absolute bottom-4 text-slate-500 text-xs text-center w-full">
        © 2026 Mad Together. All hands on deck.
      </div>
    </div>
  );
}