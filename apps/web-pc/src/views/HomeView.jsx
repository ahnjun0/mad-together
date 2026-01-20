import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { createRoom } from '../api/room';
import { usePcSocket } from '../hooks/usePcSocket';
import GlassPanel from '../components/GlassPanel';
import GlossyButton from '../components/GlossyButton';
import bgShip from '../assets/background-ship.jpg';

export default function HomeView() {
  const [roomName, setRoomName] = useState('');
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');
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
      // Host는 이미 인증된 상태이므로 accessToken 사용
      // createRoom API는 roomName, teamAName, teamBName, maxPlayers, accessToken 순으로 인자를 받는다고 가정
      const roomData = await createRoom(roomName, teamAName, teamBName, maxPlayers, accessToken);

      // Store에 방 정보 저장
      setRoomInfo({
        roomId: roomData.roomId,
        code: roomData.code,
        qrCode: roomData.qrCode,
        roomName: roomData.roomName || roomName,
        teamAName: roomData.teamAName,
        teamBName: roomData.teamBName,
        maxPlayers: roomData.maxPlayers,
        status: 'WAITING',
      });

      // 대기 화면으로 전환
      setGameState('WAITING');

      // 소켓 연결 대기 후 Host로서 방에 입장 (Observer)
      console.log('[HomeView] Room created, waiting for socket connection...');
      await waitForConnection();

      if (roomData.roomId) {
        console.log('[HomeView] Socket connected, joining room as host (observer)...');
        await joinRoom(roomData.roomId);
      }
    } catch (err) {
      setError(err.message || '방 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Background Layer: 항상 화면 전체를 꽉 채움 */}
      <div 
        className="fixed inset-0 w-full h-full z-0 bg-[#AEE2FF] bg-cover bg-[center_bottom]"
        style={{ 
          backgroundImage: `url(${bgShip})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Content Layer (Safe Zone): UI 컨테이너는 중앙에 배치 */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <div className="w-full max-w-[1600px] h-full relative">
          {/* 호스트 정보 및 로그아웃 버튼 */}
          <div className="fixed top-4 right-4 flex items-center gap-3 bg-white/70 backdrop-blur-md rounded-full px-4 py-2 shadow-md z-50">
            {user?.profileImage && (
              <img src={user.profileImage} alt="Profile" className="w-8 h-8 rounded-full" />
            )}
            <span className="text-gray-700 font-semibold">{user?.nickname}</span>
            <button
              onClick={logout}
              className="text-red-500 hover:text-red-700 text-sm font-semibold"
            >
              로그아웃
            </button>
          </div>

          {/* GlassPanel: 화면 중앙(가로, 세로)에 고정 */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-full max-w-xl px-4">
        <GlassPanel className="pt-10 pb-10 px-6 md:px-10 flex flex-col gap-8 items-stretch">
          {/* 타이틀 */}
          <h1 className="text-4xl md:text-5xl font-fredoka text-center text-[#1e3a8a] text-outline tracking-wide mb-2">
            Game Settings
          </h1>

          <form onSubmit={handleCreateRoom} className="space-y-5 md:space-y-6">
            {/* Room Name */}
            <div className="space-y-2">
              <label className="block text-sm md:text-base text-[#1f2933] font-semibold">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="
                  w-full px-4 py-3 md:py-4 rounded-[16px]
                  border-[3px] border-blue-500 bg-white/90
                  text-gray-800 text-base md:text-lg
                  focus:outline-none focus:ring-4 focus:ring-blue-300/60
                  placeholder:text-gray-400
                  shadow-sm
                "
                required
              />
            </div>

            {/* Team A */}
            <div className="space-y-2">
              <label className="block text-sm md:text-base text-[#1f2933] font-semibold">
                Team A Name
              </label>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                className="
                  w-full px-4 py-3 md:py-4 rounded-[16px]
                  border-[3px] border-team-a bg-white/90
                  text-gray-800 text-base md:text-lg
                  focus:outline-none focus:ring-4 focus:ring-orange-300/60
                  placeholder:text-gray-400
                  shadow-sm
                "
                required
              />
            </div>

            {/* Team B */}
            <div className="space-y-2">
              <label className="block text-sm md:text-base text-[#1f2933] font-semibold">
                Team B Name
              </label>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                className="
                  w-full px-4 py-3 md:py-4 rounded-[16px]
                  border-[3px] border-team-b bg-white/90
                  text-gray-800 text-base md:text-lg
                  focus:outline-none focus:ring-4 focus:ring-cyan-300/60
                  placeholder:text-gray-400
                  shadow-sm
                "
                required
              />
            </div>

            {/* Max Players (Per Team) */}
            <div className="space-y-2">
              <label className="block text-sm md:text-base text-[#1f2933] font-semibold">
                Max Players (Per Team)
              </label>
              <div
                className="
                  relative
                  w-full rounded-[16px] border-[3px] border-blue-500
                  bg-white/90 shadow-sm
                "
              >
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="
                    w-full appearance-none bg-transparent
                    px-4 py-3 md:py-4 pr-10
                    text-gray-800 text-base md:text-lg
                    focus:outline-none
                  "
                >
                  {[4, 6, 8, 10, 12].map((value) => (
                    <option key={value} value={value}>
                      {value} Players
                    </option>
                  ))}
                </select>
                {/* 드롭다운 아이콘 */}
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <span className="text-blue-600 text-xl">▾</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 font-game">
                각 팀별 최대 인원 수입니다.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Create Room Button */}
            <div className="pt-4">
              <GlossyButton type="submit" disabled={loading} variant="primary">
                {loading ? 'Creating...' : 'CREATE ROOM'}
              </GlossyButton>
            </div>
          </form>
        </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
