import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';
import { useShake, requestPermission } from '../hooks/useShake';

export default function InGameView() {
  const { myTeam, score } = useMobileStore();
  const { shake } = useMobileSocket();
  const [permission, setPermission] = useState('prompt');

  // Shake callback
  const handleShake = useCallback(
    (count) => {
      shake(count);
    },
    [shake]
  );

  // Use shake hook
  const { isShaking } = useShake(handleShake, permission);

  // Request permission handler
  const handleRequestPermission = async () => {
    const result = await requestPermission();
    setPermission(result);
  };

  // If permission not granted, show permission request
  if (permission !== 'granted') {
    return (
      <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900">
        <div className="text-center space-y-4">
          <p className="text-white text-lg">센서 권한이 필요합니다</p>
          <button
            onClick={handleRequestPermission}
            className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg active:scale-95 transition-transform"
          >
            권한 허용
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900">
      {/* Team and Score Display */}
      <div className="mb-8 text-center">
        <div className={`text-2xl font-bold mb-2 ${
          myTeam === 'A' ? 'text-orange-500' : 'text-cyan-500'
        }`}>
          Team {myTeam}
        </div>
        <div className="text-white text-lg">
          A: {score.A} | B: {score.B}
        </div>
      </div>

      {/* Shake Visual Feedback */}
      <motion.div
        className={`w-48 h-48 rounded-full flex items-center justify-center ${
          isShaking ? 'bg-red-500' : 'bg-gray-700'
        }`}
        animate={{
          scale: isShaking ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 0.3,
          repeat: isShaking ? Infinity : 0,
        }}
      >
        <span className="text-white text-2xl font-bold">
          {isShaking ? 'SHAKE!' : 'READY'}
        </span>
      </motion.div>

      <p className="mt-8 text-gray-400 text-center">
        휴대폰을 흔들어주세요
      </p>
    </div>
  );
}
