import { useState } from 'react';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

const SERVER_URL = import.meta.env.VITE_API_URL || 'https://madcamp.cloud';

export default function ProfileSetupView() {
  const { nickname, token, setNickname } = useMobileStore();
  const { joinRoom } = useMobileSocket();

  const [inputNickname, setInputNickname] = useState(nickname || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = inputNickname.trim();
    if (!trimmed) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/api/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: trimmed }),
      });

      if (!response.ok) {
        let errorMessage = '프로필 설정에 실패했습니다.';
        try {
          const errData = await response.json();
          if (errData.message) errorMessage = errData.message;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setNickname(data.nickname);

      const targetCode = useMobileStore.getState().pendingRoomCode;
      if (targetCode) {
        await joinRoom(targetCode, data.nickname, null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || '프로필 설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-slate-900">
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/20 p-8 rounded-2xl text-center shadow-2xl">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium text-lg">입장 중...</p>
            <p className="text-blue-200 text-sm mt-2">잠시만 기다려주세요</p>
          </div>
        </div>
      )}
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-6">닉네임 확인</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-blue-200 text-sm font-bold ml-1">닉네임</label>
            <input
              type="text"
              value={inputNickname}
              onChange={(e) => setInputNickname(e.target.value)}
              maxLength={20}
              className="w-full px-5 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="닉네임을 입력하세요"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !inputNickname.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? '입장 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
