import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { usePcSocket } from '../hooks/usePcSocket';
import GlassPanel from '../components/GlassPanel';
import PlayerCard from '../components/PlayerCard';
import TeamScoreCard from '../components/TeamScoreCard';
import GlossyButton from '../components/GlossyButton';
import Confetti from '../components/Confetti';
import backgroundOnship from '../assets/background_onship.png';
import backgroundFinishedLeft from '../assets/background_finished_left.png';
import backgroundFinishedRight from '../assets/background_finished_right.png';

export default function FinishedView() {
  const { score, gameResult, roomInfo } = useGameStore();
  const { resetGame } = usePcSocket();
  const winner = score.A > score.B ? 'A' : score.A < score.B ? 'B' : null;

  // Get player scores by team, sorted by score descending
  const teamAPlayers = (gameResult?.playerScores || [])
    .filter(p => p.team === 'A')
    .sort((a, b) => b.score - a.score);

  const teamBPlayers = (gameResult?.playerScores || [])
    .filter(p => p.team === 'B')
    .sort((a, b) => b.score - a.score);

  const mvp = gameResult?.mvp;

  // 배경 이미지 선택 (승리팀에 따라)
  const getBackgroundImage = () => {
    if (winner === 'A') return backgroundFinishedLeft;
    if (winner === 'B') return backgroundFinishedRight;
    return backgroundOnship; // 무승부 또는 기본
  };

  const handleExit = () => {
    console.log('[FinishedView] 🔄 Starting new game - requesting server reset');
    
    // 서버에 게임 초기화 요청 (모든 클라이언트 동기화)
    resetGame();
  };

  return (
    <div 
      className="w-full h-full relative flex items-center justify-center p-8 bg-cover bg-center"
      style={{ backgroundImage: `url(${getBackgroundImage()})` }}
    >
      {/* 승리팀이 있을 때 폭죽 애니메이션 */}
      {winner && <Confetti duration={6000} />}

      {/* 메인 컨텐츠 */}
      <div className="w-full max-w-6xl grid grid-cols-2 gap-8 relative z-10">
        {/* Team A Panel */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassPanel 
            border="team-a" 
            className="h-full flex flex-col"
          >
            {/* 헤더: Winner/Loser 표시 */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {winner === 'A' && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-5xl"
                >
                  👑
                </motion.div>
              )}
              <h2 className={`text-4xl font-black text-outline ${winner === 'A' ? 'text-yellow-400' : 'text-gray-600'}`}>
                {winner === 'A' ? 'WINNER!' : winner === 'B' ? 'LOSER' : 'DRAW'}
              </h2>
            </div>

            {/* 팀 이름 */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-3xl">A</span>
              </div>
              <h3 className="text-3xl font-black text-orange-600 font-game">
                {roomInfo.teamAName || 'Team A'}
              </h3>
            </div>

            {/* 팀 점수 카드 */}
            <div className="mb-4">
              <TeamScoreCard 
                teamName={roomInfo.teamAName || 'Team A'}
                score={score.A}
                teamColor="team-a"
                isWinner={winner === 'A'}
              />
            </div>

            {/* 플레이어 리스트 (스크롤) */}
            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-2 custom-scrollbar">
              {teamAPlayers.length > 0 ? (
                teamAPlayers.map((player, index) => (
                  <PlayerCard
                    key={player.playerId}
                    nickname={player.nickname}
                    teamColor="team-a"
                    score={player.score}
                    isMVP={mvp?.playerId === player.playerId}
                    showRank={index + 1}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-8 font-game">
                  플레이어 없음
                </div>
              )}
            </div>
          </GlassPanel>
        </motion.div>

        {/* Team B Panel */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassPanel 
            border="team-b" 
            className="h-full flex flex-col"
          >
            {/* 헤더: Winner/Loser 표시 */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {winner === 'B' && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-5xl"
                >
                  👑
                </motion.div>
              )}
              <h2 className={`text-4xl font-black text-outline ${winner === 'B' ? 'text-yellow-400' : 'text-gray-600'}`}>
                {winner === 'B' ? 'WINNER!' : winner === 'A' ? 'LOSER' : 'DRAW'}
              </h2>
            </div>

            {/* 팀 이름 */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-3xl">B</span>
              </div>
              <h3 className="text-3xl font-black text-cyan-600 font-game">
                {roomInfo.teamBName || 'Team B'}
              </h3>
            </div>

            {/* 팀 점수 카드 */}
            <div className="mb-4">
              <TeamScoreCard 
                teamName={roomInfo.teamBName || 'Team B'}
                score={score.B}
                teamColor="team-b"
                isWinner={winner === 'B'}
              />
            </div>

            {/* 플레이어 리스트 (스크롤) */}
            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-2 custom-scrollbar">
              {teamBPlayers.length > 0 ? (
                teamBPlayers.map((player, index) => (
                  <PlayerCard
                    key={player.playerId}
                    nickname={player.nickname}
                    teamColor="team-b"
                    score={player.score}
                    isMVP={mvp?.playerId === player.playerId}
                    showRank={index + 1}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-8 font-game">
                  플레이어 없음
                </div>
              )}
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* 저장하고 나가기 버튼 (우측 하단) */}
      <div className="fixed bottom-8 right-8 z-50 w-64">
        <GlossyButton 
          onClick={handleExit}
          variant="primary"
        >
          새 게임 시작하기
        </GlossyButton>
      </div>

      {/* 커스텀 스크롤바 스타일 */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </div>
  );
}
