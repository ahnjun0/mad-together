// apps/web-pc/src/components/TeamPanel.jsx
import React from 'react';
import GlassPanel from './GlassPanel';
import PlayerCard from './PlayerCard';

export default function TeamPanel({ teamName, players, color }) {
  // color prop: 'team-a' 또는 'team-b'
  const titleColor = color === 'team-a' ? 'text-team-a' : 'text-team-b';
  
  // 플레이어가 없는 빈 슬롯 채우기 (최소 1개 정도는 빈칸 표시해주면 좋음)
  const isEmpty = players.length === 0;

  return (
    <GlassPanel border={color} className="h-full flex flex-col min-h-[400px]">
      {/* 팀 헤더 (아웃라인 텍스트) */}
      <h2 className={`
        text-4xl md:text-5xl font-fredoka text-center mb-6 tracking-wide
        text-outline ${titleColor}
        drop-shadow-lg
      `}>
        {teamName}
      </h2>

      {/* 플레이어 리스트 영역 (스크롤 가능) */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {players.map((player) => (
          <PlayerCard 
            key={player.id || player.nickname} // 고유 키 사용
            nickname={player.nickname}
            isLeader={player.isLeader}
            isReady={player.isReady}
            teamColor={color}
          />
        ))}

        {/* 대기 중 메시지 */}
        {isEmpty && (
          <div className="
            h-24 flex items-center justify-center 
            border-2 border-dashed border-white/60 rounded-[20px] 
            bg-white/10 mt-2
          ">
            <p className="text-white/80 font-fredoka text-lg">
              Waiting for players...
            </p>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}