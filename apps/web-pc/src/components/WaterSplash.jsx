// apps/web-pc/src/components/WaterSplash.jsx
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * 물보라 파티클 효과 컴포넌트
 * @param {number} intensity - shake intensity (0~1)
 * @param {string} teamColor - 'team-a' or 'team-b'
 */
export default function WaterSplash({ intensity, teamColor }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (intensity > 0.1) {
      // intensity에 따라 파티클 생성 (높을수록 많이)
      const particleCount = Math.floor(intensity * 8); // 최대 8개
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        x: Math.random() * 100 - 50, // -50 ~ 50
        y: Math.random() * 50, // 0 ~ 50
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5, // 0.5 ~ 1.0
        duration: 0.8 + Math.random() * 0.4, // 0.8 ~ 1.2초
      }));

      setParticles(prev => [...prev.slice(-20), ...newParticles]); // 최대 20개 유지

      // 파티클 제거
      const timeout = setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [intensity]);

  const particleColor = teamColor === 'team-a' 
    ? 'rgba(255, 140, 0, 0.6)' // Orange
    : 'rgba(0, 191, 255, 0.6)'; // Cyan

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute bottom-1/4 left-1/2"
          initial={{
            x: particle.x,
            y: 0,
            opacity: 0.8,
            scale: particle.scale,
            rotate: particle.rotation,
          }}
          animate={{
            x: particle.x * 1.5,
            y: -particle.y,
            opacity: 0,
            scale: particle.scale * 0.3,
          }}
          transition={{
            duration: particle.duration,
            ease: 'easeOut',
          }}
        >
          {/* 물방울 */}
          <div
            className="w-3 h-3 rounded-full blur-sm"
            style={{ backgroundColor: particleColor }}
          />
        </motion.div>
      ))}
    </div>
  );
}
