// apps/web-pc/src/components/QRCodePanel.jsx
import React from 'react';

export default function QRCodePanel({ qrCodeUrl, roomCode }) {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* QR 코드 컨테이너 (흰색 배경 필수) */}
      <div className="p-4 bg-white rounded-[30px] shadow-xl transform rotate-1 mb-6">
        {qrCodeUrl ? (
           // 백엔드에서 Base64 이미지로 줄 경우
          <img 
            src={qrCodeUrl} 
            alt="Join Room QR" 
            className="w-48 h-48 md:w-64 md:h-64 object-contain"
          />
        ) : (
           // 로딩 중이거나 QR 생성 전
          <div className="w-48 h-48 md:w-64 md:h-64 bg-gray-100 animate-pulse rounded-xl" />
        )}
      </div>

      {/* 방 코드 텍스트 */}
      <div className="text-center">
        <p className="text-white/90 font-fredoka text-xl mb-1 drop-shadow-md">
          Entry Code
        </p>
        <h1 className="
          text-5xl md:text-7xl font-fredoka text-white 
          tracking-[0.1em] text-outline drop-shadow-xl
        ">
          {roomCode}
        </h1>
      </div>
    </div>
  );
}
