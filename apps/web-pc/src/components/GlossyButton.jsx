// apps/web-pc/src/components/GlossyButton.jsx
import React from 'react';

export default function GlossyButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary', 
  className = '',
  type = 'button'
}) {
  // 색상 테마 정의 (배경 그라데이션 + 그림자 색상)
  const variants = {
    primary: 'bg-gradient-to-b from-[#10b981] to-[#059669] shadow-[0_8px_0_0_#047857] hover:shadow-[0_6px_0_0_#047857] active:shadow-[0_2px_0_0_#047857]', // Start Button (Green)
    'team-a': 'bg-gradient-to-b from-[#FFAA40] to-[#FF8C00] shadow-[0_8px_0_0_#CC7000] hover:shadow-[0_6px_0_0_#CC7000] active:shadow-[0_2px_0_0_#CC7000]', // Team A (Orange)
    'team-b': 'bg-gradient-to-b from-[#4D96FF] to-[#00BFFF] shadow-[0_8px_0_0_#0099CC] hover:shadow-[0_6px_0_0_#0099CC] active:shadow-[0_2px_0_0_#0099CC]', // Team B (Cyan)
    disabled: 'bg-gradient-to-b from-gray-400 to-gray-500 shadow-[0_8px_0_0_#4b5563] cursor-not-allowed opacity-70',
  };

  const styleClass = disabled ? variants.disabled : variants[variant];

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        w-full py-4 md:py-6 rounded-[25px] 
        font-fredoka font-black text-2xl md:text-3xl text-white 
        border-[4px] border-white/40 
        transition-all duration-150
        ${!disabled && 'hover:-translate-y-1 active:translate-y-[4px]'} 
        ${styleClass}
        ${className}
      `}
    >
      {/* 텍스트에 아웃라인 효과 추가 (가독성 향상) */}
      <span className="drop-shadow-md text-outline-dark/10">
        {children}
      </span>
    </button>
  );
}