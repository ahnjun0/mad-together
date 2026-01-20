// apps/web-pc/src/components/PlayerCard.jsx
import React, { useState } from 'react';
import { API_BASE_URL } from '../api/room';

export default function PlayerCard({ nickname, isLeader, isReady, teamColor, sensorChecked, profileImage }) {
  const [imageError, setImageError] = useState(false);
  // 팀에 따른 텍스트/아이콘 색상 결정
  const colorClass = teamColor === 'team-a' ? 'text-team-a' : 'text-team-b';
  const bgClass = teamColor === 'team-a' ? 'bg-orange-100' : 'bg-cyan-100';

  // sensorChecked가 true일 때 녹색 테두리 + glow 효과
  const borderClass = sensorChecked
    ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] ring-2 ring-green-400'
    : 'border-white';

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}${url}`;
  };

  return (
    <div className={`
      flex items-center justify-between 
      w-full p-3 mb-3 
      bg-white rounded-[20px] shadow-sm border-2 transition-all duration-300
      ${borderClass}
      ${sensorChecked ? 'animate-pulse' : ''}
    `}>
      <div className="flex items-center gap-3">
        {/* 아바타 (프로필 이미지 또는 이니셜) */}
        <div
          className={`
          flex items-center justify-center 
          w-10 h-10 rounded-full font-black text-xl 
          overflow-hidden
          ${bgClass} ${colorClass}
        `}
        >
          {profileImage && !imageError ? (
            <img
              src={getImageUrl(profileImage)}
              alt={nickname}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span>
              {nickname?.charAt(0)?.toUpperCase() || 'P'}
            </span>
          )}
        </div>
        
        {/* 닉네임 + 리더 표시 */}
        <div className="flex flex-col">
          <span className="font-game text-lg text-gray-800 leading-none">
            {nickname}
          </span>
          {isLeader && (
            <span className="text-xs font-bold text-yellow-500 flex items-center gap-1 mt-1">
              👑 LEADER
            </span>
          )}
        </div>
      </div>

      {/* Ready 상태 배지 */}
      {isReady && (
        <span className="
          bg-green-500 text-white text-xs font-black 
          px-3 py-1 rounded-full shadow-sm
          animate-pulse
        ">
          READY!
        </span>
      )}
    </div>
  );
}