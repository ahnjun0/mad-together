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
      // intensity에 따라 파티클 생성 (높을수록 많이) - 개수 2배 증가
      const particleCount = Math.floor(intensity * 16); // 최대 16개 (기존 8개에서 2배)
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        x: Math.random() * 100 - 50, // -50 ~ 50
        y: Math.random() * 50, // 0 ~ 50
        rotation: Math.random() * 360,
        scale: 1.0 + Math.random() * 1.0, // 1.0 ~ 2.0 (기존 0.5 ~ 1.0에서 2배)
        duration: 0.8 + Math.random() * 0.4, // 0.8 ~ 1.2초
      }));

      setParticles(prev => [...prev.slice(-40), ...newParticles]); // 최대 40개 유지 (기존 20개에서 2배)

      // 파티클 제거
      const timeout = setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [intensity]);

  // 색상 채도와 밝기 강화 (투명도 0.6 → 0.9)
  const particleColor = teamColor === 'team-a' 
    ? 'rgba(255, 140, 0, 0.9)' // Orange - 더 진하고 밝게
    : 'rgba(0, 191, 255, 0.9)'; // Cyan - 더 진하고 밝게

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
          {/* 물방울 - 크기 2배 증가 (w-3 h-3 → w-6 h-6), blur 제거로 선명하게 */}
          <div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: particleColor }}
          />
        </motion.div>
      ))}
    </div>
  );
}
