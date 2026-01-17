import { useEffect, useRef, useState } from 'react';

const THRESHOLD_HIGH = 30;
const THRESHOLD_LOW = 10;

export function useShake(onShake, permission) {
  const [isShaking, setIsShaking] = useState(false);
  const isShakingRef = useRef(false);

  useEffect(() => {
    if (permission !== 'granted') return;

    const handleDeviceMotion = (event) => {
      const { x, y, z } = event.accelerationIncludingGravity || {};
      
      if (x === null || y === null || z === null) return;

      // Calculate power: sqrt(x^2 + y^2 + z^2)
      const power = Math.sqrt(x * x + y * y + z * z);

      // Schmitt Trigger Logic
      if (!isShakingRef.current && power > THRESHOLD_HIGH) {
        // Start shake detected
        isShakingRef.current = true;
        setIsShaking(true);
      } else if (isShakingRef.current && power < THRESHOLD_LOW) {
        // End shake detected - trigger callback
        isShakingRef.current = false;
        setIsShaking(false);
        if (onShake) {
          onShake(1); // count = 1
        }
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [permission, onShake]);

  return { isShaking };
}

// iOS Permission Request (must be called from user interaction)
export function requestPermission() {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    return DeviceMotionEvent.requestPermission();
  }
  return Promise.resolve('granted'); // Non-iOS devices
}
