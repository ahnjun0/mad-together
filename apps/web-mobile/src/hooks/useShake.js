import { useEffect, useRef, useState } from 'react';
import { useMobileStore } from '../store/useMobileStore';

const THRESHOLD_HIGH = 30;
const THRESHOLD_LOW = 10;

export function useShake(onShake, permission) {
  const [isShaking, setIsShaking] = useState(false);
  const isShakingRef = useRef(false);
  const maxPowerRef = useRef(0);
  const setCastingPower = useMobileStore((state) => state.setCastingPower);

  useEffect(() => {
    if (permission !== 'granted') return;

    const handleDeviceMotion = (event) => {
      const { x, y, z } = event.accelerationIncludingGravity || {};
      if (x === null || y === null || z === null) return;

      // Calculate power: sqrt(x^2 + y^2 + z^2)
      const power = Math.sqrt(x * x + y * y + z * z);

      // Schmitt Trigger Logic
      if (!isShakingRef.current && power > THRESHOLD_HIGH) {
        // Start of a shake
        isShakingRef.current = true;
        setIsShaking(true);
        maxPowerRef.current = power;
      } else if (isShakingRef.current) {
        // Track maximum power during this shake
        if (power > maxPowerRef.current) {
          maxPowerRef.current = power;
        }

        // Detect end of shake
        if (power < THRESHOLD_LOW) {
          isShakingRef.current = false;
          setIsShaking(false);
          if (onShake) {
            onShake(maxPowerRef.current); // pass peak power for this shake
          }
          // Haptic feedback
          if (navigator && typeof navigator.vibrate === 'function') {
            navigator.vibrate(50);
          }
          maxPowerRef.current = 0;
        }
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      isShakingRef.current = false;
      setIsShaking(false);
      maxPowerRef.current = 0;
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
