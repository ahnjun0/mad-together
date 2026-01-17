import { useState } from 'react';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

export default function LoginView() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { joinRoom } = useMobileSocket();
  const { setGameState } = useMobileStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await joinRoom(code.toUpperCase(), nickname);
      setGameState('WAITING'); // Change to LOBBY after successful join
    } catch (err) {
      setError(err.message || '입장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          게임 입장
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white font-semibold mb-2">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border-2 border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">
              입장 코드
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="6자리 코드"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border-2 border-gray-700 focus:border-blue-500 focus:outline-none uppercase"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !nickname || !code}
            className={`w-full py-4 rounded-lg font-bold text-white transition-all ${
              loading || !nickname || !code
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
            }`}
          >
            {loading ? '입장 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
