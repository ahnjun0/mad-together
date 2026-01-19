import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { createRoom } from '../api/room';
import { usePcSocket } from '../hooks/usePcSocket';

export default function HomeView() {
  const [teamAName, setTeamAName] = useState('A팀');
  const [teamBName, setTeamBName] = useState('B팀');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setRoomInfo, setGameState, accessToken, user, logout } = useGameStore();
  const { joinRoom, waitForConnection } = usePcSocket();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 이미 로그인된 상태이므로 accessToken 사용
      const roomData = await createRoom(teamAName, teamBName, maxPlayers, accessToken);

      // Update store with room info
      setRoomInfo({
        roomId: roomData.roomId,
        code: roomData.code,
        qrCode: roomData.qrCode,
        teamAName: roomData.teamAName,
        teamBName: roomData.teamBName,
        maxPlayers: roomData.maxPlayers,
        status: 'WAITING',
      });

      // Transition to waiting view
      setGameState('WAITING');

      // 소켓 연결 대기 후 Host로서 방에 입장
      console.log('[HomeView] Room created, waiting for socket connection...');
      await waitForConnection();

      if (roomData.roomId) {
        console.log('[HomeView] Socket connected, joining room as host...');
        // Host는 playerId 없이 입장 (Observer)
        await joinRoom(roomData.roomId);
      }
    } catch (err) {
      setError(err.message || '방 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-cyan-200">
      {/* 사용자 정보 및 로그아웃 */}
      <div className="fixed top-4 right-4 flex items-center gap-3 bg-white/90 rounded-full px-4 py-2 shadow-md">
        {user.profileImage && (
          <img src={user.profileImage} alt="Profile" className="w-8 h-8 rounded-full" />
        )}
        <span className="text-gray-700 font-medium">{user.nickname}</span>
        <button
          onClick={logout}
          className="text-red-500 hover:text-red-700 text-sm font-medium"
        >
          로그아웃
        </button>
      </div>

      <div className="bg-white/90 rounded-[20px] border-2 border-blue-900 p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-outline text-white text-center mb-8">
          새 게임 생성
        </h1>

        <form onSubmit={handleCreateRoom} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Team A 이름
            </label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Team B 이름
            </label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              최대 인원수 (팀당)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 10)}
              className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-gray-800"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-lg font-bold text-white transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 hover:scale-105 shadow-lg shadow-green-500/50'
            }`}
          >
            {loading ? '생성 중...' : '게임 방 만들기'}
          </button>
        </form>
      </div>
    </div>
  );
}
