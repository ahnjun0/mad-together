import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { useGameStore, useShakeIntensity } from '../store/useGameStore';
import rodGlb from '../assets/rod.glb';

// Bone names from the GLB file (no dots in names)
const BONE_NAMES = ['본', '본001', '본002', '본003', '본004'];

/**
 * FishingRod model component with bone animation
 * Handles pump and wind motion + bend effect based on shake intensity
 */
function FishingRodModel({ team, mirrored = false }) {
  const { scene } = useGLTF(rodGlb);
  const groupRef = useRef();
  const bonesRef = useRef([]);
  const skinnedMeshRef = useRef(null);
  const animationStateRef = useRef({
    phase: 0, // 0: idle, 1: pumping left, 2: returning from left, 3: pumping right, 4: returning from right
    progress: 0,
    lastShakeTime: 0,
    isAnimating: false,
    pumpDirection: 1, // 1: left, -1: right
  });

  // Get shake intensity from store (0-1)
  const shakeHistory = useGameStore((state) => state.shakeHistory[team]);
  const SHAKE_WINDOW_MS = useGameStore((state) => state.SHAKE_WINDOW_MS);
  const MAX_SHAKES_PER_SECOND = useGameStore((state) => state.MAX_SHAKES_PER_SECOND);

  // Calculate intensity
  const intensity = useMemo(() => {
    if (!shakeHistory || shakeHistory.length === 0) return 0;
    const now = Date.now();
    const cutoff = now - SHAKE_WINDOW_MS;
    const recentShakes = shakeHistory.filter((t) => t >= cutoff);
    const shakesPerSecond = recentShakes.length / (SHAKE_WINDOW_MS / 1000);
    return Math.min(shakesPerSecond / MAX_SHAKES_PER_SECOND, 1);
  }, [shakeHistory, SHAKE_WINDOW_MS, MAX_SHAKES_PER_SECOND]);

  // Clone the scene using SkeletonUtils for proper SkinnedMesh cloning
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);

    // Clone materials to avoid sharing
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
      }
    });

    return clone;
  }, [scene]);

  // Find and store bone references from skeleton
  useEffect(() => {
    const bones = [];
    clonedScene.traverse((child) => {
      if (child.isSkinnedMesh) {
        skinnedMeshRef.current = child;
        // Get bones from skeleton
        if (child.skeleton?.bones) {
          child.skeleton.bones.forEach((bone) => {
            const idx = BONE_NAMES.indexOf(bone.name);
            if (idx !== -1) {
              bones[idx] = bone;
            }
          });
        }
      }
    });
    bonesRef.current = bones;
  }, [clonedScene]);

  // Animation loop
  useFrame((state, delta) => {
    const bones = bonesRef.current;
    if (!bones.length) return;

    const animState = animationStateRef.current;
    const now = Date.now();

    // Trigger new pump when shake intensity is high enough
    if (intensity > 0.05 && !animState.isAnimating) {
      animState.isAnimating = true;
      animState.phase = 1;
      animState.progress = 0;
      animState.lastShakeTime = now;
    }

    // Animation speed based on intensity (faster when shaking more)
    const baseSpeed = 2.0; // Base animation speed
    const speedMultiplier = 1 + intensity * 3; // 1x to 4x speed
    const animSpeed = baseSpeed * speedMultiplier;

    // Pump and wind animation
    if (animState.isAnimating) {
      animState.progress += delta * animSpeed;

      // Phase timing (each phase takes 0.5 normalized time)
      const phaseTime = 0.5;

      if (animState.progress >= phaseTime) {
        animState.progress = 0;
        animState.phase++;

        // Cycle through phases: 1->2->3->4->1 (if still shaking) or stop
        if (animState.phase > 4) {
          if (intensity > 0.05) {
            animState.phase = 1;
          } else {
            animState.phase = 0;
            animState.isAnimating = false;
          }
        }
      }

      // Calculate pump angle based on phase
      let pumpAngle = 0;
      let bendIntensity = 0;
      const phaseProgress = animState.progress / phaseTime;
      const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      switch (animState.phase) {
        case 1: // Pumping left (raise rod tip to left shoulder)
          pumpAngle = easeInOut(phaseProgress) * 0.4; // ~23 degrees
          bendIntensity = easeInOut(phaseProgress) * 0.8;
          break;
        case 2: // Returning from left
          pumpAngle = (1 - easeInOut(phaseProgress)) * 0.4;
          bendIntensity = (1 - easeInOut(phaseProgress)) * 0.8;
          break;
        case 3: // Pumping right (raise rod tip to right shoulder)
          pumpAngle = -easeInOut(phaseProgress) * 0.4;
          bendIntensity = easeInOut(phaseProgress) * 0.8;
          break;
        case 4: // Returning from right
          pumpAngle = -(1 - easeInOut(phaseProgress)) * 0.4;
          bendIntensity = (1 - easeInOut(phaseProgress)) * 0.8;
          break;
        default:
          pumpAngle = 0;
          bendIntensity = 0;
      }

      // Apply mirror for Team B (right side of screen)
      if (mirrored) {
        pumpAngle = -pumpAngle;
      }

      // Apply bone rotations for pump motion
      // Root bone (본) handles the main pump rotation (around Z axis for left/right)
      if (bones[0]) {
        // Pump rotation (left/right shoulder direction)
        bones[0].rotation.z = pumpAngle;
      }

      // Apply bend effect to all bones (circular arc toward water)
      // The bend should make the rod curve like a loaded bow
      bones.forEach((bone, index) => {
        if (!bone) return;

        // Skip root bone for bend (already handling pump)
        if (index === 0) return;

        // Progressive bend - more bend toward the tip
        const boneWeight = (index / (bones.length - 1)); // 0 to 1
        const bendAmount = bendIntensity * boneWeight * 0.15; // Max bend per bone

        // Bend toward "water" (forward/down direction)
        // X rotation bends forward, adjust based on rod orientation
        bone.rotation.x = bendAmount;
      });
    } else {
      // Idle state - reset rotations smoothly
      bones.forEach((bone, index) => {
        if (!bone) return;

        // Lerp back to rest position
        bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, 0, delta * 3);
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, 0, delta * 3);
      });
    }

    // Update skeleton after bone changes
    if (skinnedMeshRef.current?.skeleton) {
      skinnedMeshRef.current.skeleton.update();
    }
  });

  return (
    <group ref={groupRef}>
      {/* Position rod at chest height, centered */}
      <primitive
        object={clonedScene}
        scale={0.5}
        position={[0, -1.2, 0]}
        rotation={[0.1, mirrored ? Math.PI : 0, 0]} // Slight tilt, mirror for Team B
      />
    </group>
  );
}

/**
 * FishingRod3D - Complete 3D fishing scene for one team
 */
export function FishingRod3D({ team, className = '' }) {
  const mirrored = team === 'B';

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas shadows>
        {/* Camera at chest height, looking at the rod */}
        <PerspectiveCamera
          makeDefault
          position={[0, 0.8, 2.5]}
          fov={60}
          near={0.1}
          far={100}
        />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />

        {/* Environment for reflections */}
        <Environment preset="sunset" />

        {/* The fishing rod */}
        <FishingRodModel team={team} mirrored={mirrored} />

        {/* Optional: Ocean/sky background gradient via fog */}
        <fog attach="fog" args={['#87CEEB', 10, 50]} />
      </Canvas>
    </div>
  );
}

// Preload the GLB
useGLTF.preload(rodGlb);

export default FishingRod3D;
