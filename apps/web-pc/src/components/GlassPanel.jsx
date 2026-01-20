// apps/web-pc/src/components/GlassPanel.jsx
import React from 'react';

export default function GlassPanel({ children, className = '', border = 'white' }) {
  // 테두리 색상 매핑
  const borderColors = {
    white: 'border-white/50',
    black: 'border-black/80',
    'team-a': 'border-team-a', // tailwind.config.js에 설정된 색상
    'team-b': 'border-team-b',
  };

  return (
    <div 
      className={`
        backdrop-blur-md bg-white/30 
        rounded-[30px] p-6 border-[4px] 
        ${borderColors[border] || borderColors.white}
        ${className}
      `}
    >
      {children}
    </div>
  );
}