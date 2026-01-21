// apps/web-pc/src/components/TeamScoreCard.jsx
import React from 'react';

export default function TeamScoreCard({ teamName, score, teamColor, isWinner }) {
  const bgClass = teamColor === 'team-a' ? 'bg-orange-100' : 'bg-cyan-100';
  const textClass = teamColor === 'team-a' ? 'text-orange-600' : 'text-cyan-600';
  const borderClass = isWinner 
    ? (teamColor === 'team-a' ? 'border-orange-500 ring-2 ring-orange-400' : 'border-cyan-500 ring-2 ring-cyan-400')
    : 'border-gray-300';

  return (
    <div className={`
      flex justify-between items-center 
      p-4 rounded-[16px] border-2 ${bgClass} ${borderClass}
      transition-all duration-300
      ${isWinner ? 'shadow-lg' : 'shadow-sm'}
    `}>
      <div className="flex items-center gap-2">
        {isWinner && <span className="text-2xl">🏆</span>}
        <span className="font-semibold text-gray-800 font-game text-lg">
          {teamName} 점수
        </span>
      </div>
      <span className={`text-3xl font-black ${textClass}`}>
        {score}pt
      </span>
    </div>
  );
}
