import { useState } from 'react';
import { motion } from 'framer-motion';

// PC (Host) only view - Casting display with animation
export default function CastingView() {
  const [castTriggered, setCastTriggered] = useState(false);

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-white/90 rounded-[20px] border-2 border-blue-900 p-8">
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-outline text-white mb-4"
          >
            Casting...
          </motion.h1>
        </div>

        {/* Fishing Rod Animation Area */}
        <div className="relative h-96 bg-cyan-100 rounded-lg overflow-hidden">
          {/* Rod */}
          <motion.div
            animate={
              castTriggered
                ? {
                    scale: [1, 1.2, 0.8, 1],
                    opacity: [1, 0.8, 1],
                    rotate: [0, -30, 0],
                  }
                : {}
            }
            transition={{ duration: 1.5 }}
            className="absolute left-1/2 top-0 transform -translate-x-1/2"
          >
            <div className="text-6xl">🎣</div>
          </motion.div>

          {/* Bobber */}
          {castTriggered && (
            <motion.div
              initial={{ x: '50%', y: 0, opacity: 0 }}
              animate={{ x: '70%', y: '80%', opacity: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute text-4xl"
            >
              🎯
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
