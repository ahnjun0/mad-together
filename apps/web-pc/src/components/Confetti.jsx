// apps/web-pc/src/components/Confetti.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Confetti({ duration = 5000 }) {
  const [confettiPieces, setConfettiPieces] = useState([]);

  useEffect(() => {
    // 폭죽 조각 50개 생성
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // 0-100% 가로 위치
      delay: Math.random() * 0.5, // 0-0.5초 지연
      rotation: Math.random() * 360, // 회전
      color: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
        '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
      ][Math.floor(Math.random() * 8)],
      size: Math.random() * 10 + 5, // 5-15px 크기
    }));
    setConfettiPieces(pieces);

    // duration 후 종료
    const timer = setTimeout(() => {
      setConfettiPieces([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {confettiPieces.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute top-0"
            style={{
              left: `${piece.x}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            }}
            initial={{ 
              y: -20, 
              opacity: 1,
              rotate: 0,
            }}
            animate={{ 
              y: window.innerHeight + 20,
              opacity: [1, 1, 0.5, 0],
              rotate: piece.rotation * 3,
              x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
            }}
            transition={{
              duration: 3 + Math.random() * 2, // 3-5초
              delay: piece.delay,
              ease: 'easeIn',
            }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
