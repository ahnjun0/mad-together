// apps/web-pc/src/components/PlayerAvatar.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../api/room';

export default function PlayerAvatar({
  nickname,
  sensorChecked = false,
  teamColor = 'team-a',
  profileImage,
  size = 'default' // 'default' | 'small'
}) {
  const [imageError, setImageError] = useState(false);
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

  // 크기별 스타일
  const sizeClasses = size === 'small' 
    ? { avatar: 'w-18 h-18', text: 'text-lg', badge: 'text-xs px-2 py-0.5' }
    : { avatar: 'w-24 h-24', text: 'text-2xl', badge: 'text-sm px-3 py-1' };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    // API_BASE_URL usually ends with /api, remove it to get root
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}${url}`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 원형 프로필 아바타 */}
      <motion.div
        className={`
          flex items-center justify-center
          ${sizeClasses.avatar} rounded-full
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
        {profileImage && !imageError ? (
          <img
            src={getImageUrl(profileImage)}
            alt={nickname}
            className="w-full h-full rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={`${sizeClasses.text} font-black text-gray-700`}>
            {nickname?.charAt(0)?.toUpperCase() || '?'}
          </span>
        )}
      </motion.div>

      {/* 닉네임 배지 */}
      <div className={`${sizeClasses.badge} bg-white/80 backdrop-blur-sm rounded-full shadow-sm`}>
        <span className={`${sizeClasses.badge} font-game font-medium text-gray-800`}>
          {nickname}
        </span>
      </div>
    </div>
  );
}
