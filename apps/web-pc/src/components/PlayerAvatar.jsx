// apps/web-pc/src/components/PlayerAvatar.jsx
import React from 'react';
import { motion } from 'framer-motion';

export default function PlayerAvatar({ 
  nickname, 
  sensorChecked = false, 
  teamColor = 'team-a',
  profileImage 
}) {
  // 팀 색상에 따른 기본 테두리 색상
  const defaultBorderColor = teamColor === 'team-a' 
    ? 'border-orange-400' 
    : 'border-cyan-400';

  // sensorChecked가 true일 때 녹색 테두리 + glow 효과
  const borderClass = sensorChecked
    ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] ring-2 ring-green-400'
    : `${defaultBorderColor} border-2`;

  // 아바타 배경색 (팀 색상에 맞춤)
  const bgClass = teamColor === 'team-a' 
    ? 'bg-orange-100' 
    : 'bg-cyan-100';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 원형 프로필 아바타 */}
      <motion.div
        className={`
          flex items-center justify-center
          w-24 h-24 rounded-full
          border-2 transition-all duration-300
          ${borderClass}
          ${bgClass}
          ${sensorChecked ? 'ring-green-400' : ''}
        `}
        animate={{
          scale: sensorChecked ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          ease: 'easeInOut',
        }}
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt={nickname}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-2xl font-black text-gray-700">
            {nickname?.charAt(0)?.toUpperCase() || '?'}
          </span>
        )}
      </motion.div>

      {/* 닉네임 배지 */}
      <div className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
        <span className="text-sm font-fredoka font-medium text-gray-800">
          {nickname}
        </span>
      </div>
    </div>
  );
}
