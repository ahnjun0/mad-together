import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Environment, Line } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { useGameStore } from '../store/useGameStore';
import rodGlb from '../assets/rod2.glb';

// Bone names from the GLB file (no dots in names)
const BONE_NAMES = ['본', '본001', '본002', '본003', '본004'];

// Angle constants (in radians)
const DEG_TO_RAD = Math.PI / 180;
const BASE_ANGLE = 30 * DEG_TO_RAD;     // 준비 자세: 30도
const PUMP_ANGLE = 5 * DEG_TO_RAD;      // 펌프 최대: 5도
const PUMP_DELTA = PUMP_ANGLE - BASE_ANGLE; // 펌프 시 추가 각도

// 바다에 고정된 낚싯줄 끝 지점 (물고기가 있는 곳)
const WATER_TARGET = new THREE.Vector3(0, -1.5, -8);

/**
 * Fishing Line Component - extends from rod tip to the fixed water target
 */
function FishingLine({ rodTipPosition, bendIntensity }) {
  const lineRef = useRef();

  // Calculate line points from rod tip to fixed water target
  const points = useMemo(() => {
    // Rod tip position (actual world position from bone)
    const tipX = rodTipPosition.x;
    const tipY = rodTipPosition.y;
    const tipZ = rodTipPosition.z;

    // Fixed water target (where the fish is)
    const waterX = WATER_TARGET.x;
    const waterY = WATER_TARGET.y;
    const waterZ = WATER_TARGET.z;

    // Create a curved line with tension from fish
    // 펌프 시 줄이 팽팽해짐 (sag 감소)
    const midSag = Math.max(0.1, 0.5 - bendIntensity * 0.4);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tipX, tipY, tipZ),  // Start at rod tip
      new THREE.Vector3(
        tipX * 0.5 + waterX * 0.5,
        Math.min(tipY, waterY) - midSag,  // Sag point
        tipZ * 0.3 + waterZ * 0.7
      ),
      new THREE.Vector3(waterX, waterY, waterZ),  // End at fixed water target
    ]);

    return curve.getPoints(30);
  }, [rodTipPosition, bendIntensity]);

  return (
    <Line
      ref={lineRef}
      points={points}
      color="#3a3a3a"
      lineWidth={2}
      transparent
      opacity={0.9}
    />
  );
}

/**
 * FishingRod model component with bone animation
 * Handles pump and wind motion + bend effect based on shake intensity (PLAYING 전용)
 * Implements realistic Pump & Wind technique:
 * - Set: Base angle position
 * - Pump: Raise rod while pulling fish
 * - Wind: Lower rod while reeling
 */
function FishingRodModel({ team, mirrored = false, onTipPositionUpdate, isWinner = false, isEnding = false }) {
  const { scene } = useGLTF(rodGlb);
  const groupRef = useRef();
  const bonesRef = useRef([]);
  const skinnedMeshRef = useRef(null);
  const tipBoneRef = useRef(null);  // Reference to the tip bone for line attachment
  const animationStateRef = useRef({
    phase: 0,
    progress: 0,
    isAnimating: false,
    currentShoulder: 1, // 1: left, -1: right
    // 승리 애니메이션 상태
    victoryProgress: 0,
    isVictoryAnimating: false,
  });

  // Animation output values for fishing line
  const animValuesRef = useRef({
    bendIntensity: 0,
    sideOffset: 0,
  });

  // Vector for world position calculation
  const tipWorldPos = useMemo(() => new THREE.Vector3(), []);

  // Get shake intensity from store (0-1)
  const shakeHistory = useGameStore((state) => state.shakeHistory[team]);
  const SHAKE_WINDOW_MS = useGameStore((state) => state.SHAKE_WINDOW_MS);
  const MAX_SHAKES_PER_SECOND = useGameStore((state) => state.MAX_SHAKES_PER_SECOND);

  // Calculate intensity from shake history
  const intensity = useMemo(() => {
    if (!shakeHistory || shakeHistory.length === 0) return 0;
    const now = Date.now();
    const cutoff = now - SHAKE_WINDOW_MS;
    const recentShakes = shakeHistory.filter((t) => t >= cutoff);
    const shakesPerSecond = recentShakes.length / (SHAKE_WINDOW_MS / 1000);
    return Math.min(shakesPerSecond / MAX_SHAKES_PER_SECOND, 1);
  }, [shakeHistory, SHAKE_WINDOW_MS, MAX_SHAKES_PER_SECOND]);

  // Clone scene properly using SkeletonUtils
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
      }
    });
    return clone;
  }, [scene]);

  // Find bones from the cloned scene
  useEffect(() => {
    const bones = [];
    clonedScene.traverse((child) => {
      if (child.isSkinnedMesh) {
        skinnedMeshRef.current = child;
        if (child.skeleton?.bones) {
          child.skeleton.bones.forEach((bone) => {
            const idx = BONE_NAMES.indexOf(bone.name);
            if (idx !== -1) {
              bones[idx] = bone;
              // Store tip bone reference (last bone)
              if (idx === BONE_NAMES.length - 1) {
                tipBoneRef.current = bone;
              }
            }
          });
        }
      }
    });
    bonesRef.current = bones;
  }, [clonedScene]);

  // Animation loop
  useFrame((_, delta) => {
    const bones = bonesRef.current;
    if (!bones.length) return;

    const animState = animationStateRef.current;

    // === 승리 애니메이션 (게임 종료 시) ===
    if (isEnding && isWinner) {
      // 승리 애니메이션 시작
      if (!animState.isVictoryAnimating) {
        animState.isVictoryAnimating = true;
        animState.victoryProgress = 0;
        animState.isAnimating = false; // 기존 애니메이션 중지
      }

      // 빠르게 낚싯대 들어올리기 (약 0.3초)
      // 1회만 훅 하고 빠르게 올리도록 속도와 이징을 조절
      animState.victoryProgress = Math.min(animState.victoryProgress + delta * 3.5, 1);
      const progress = animState.victoryProgress;

      // 강력한 훅 느낌을 위한 Out-Expo 이징
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      // 낚싯대 위치: 낚아채는 순간 약간 위로 튀어오름
      if (groupRef.current) {
        groupRef.current.position.y = eased * 0.4;
        groupRef.current.rotation.x = 0; // 그룹 회전은 초기화하여 본 회전에 집중
      }

      // 루트 본 회전: BASE_ANGLE(-30도)에서 PUMP_ANGLE(-5도)로 이동 (델타 +25도)
      if (bones[0]) {
        // PUMP_DELTA = 5 - 30 = -25. 즉, eased * 25도 만큼 회전하여 -5도에 도달
        bones[0].rotation.x = eased * (-PUMP_DELTA);
      }

      // 낚싯대 휘어짐: 물고기를 낚아올릴 때의 강력한 텐션
      const totalBendAngle = eased * (60 * DEG_TO_RAD);
      const boneCount = bones.length - 1;
      bones.forEach((bone, index) => {
        if (!bone || index === 0) return;
        // PlayingView와 동일한 방향(음수)으로 휘어짐
        bone.rotation.z = -(totalBendAngle / boneCount);
      });

      // Update for victory state (line tension)
      animValuesRef.current.bendIntensity = eased * 1.2;
      animValuesRef.current.sideOffset = 0;

      // 낚싯대 끝 위치 업데이트
      if (onTipPositionUpdate && tipBoneRef.current) {
        tipBoneRef.current.getWorldPosition(tipWorldPos);
        onTipPositionUpdate({
          x: tipWorldPos.x,
          y: tipWorldPos.y,
          z: tipWorldPos.z,
          bendIntensity: animValuesRef.current.bendIntensity,
          sideOffset: 0,
          victoryProgress: progress,
        });
      }

      // Update skeleton
      if (skinnedMeshRef.current?.skeleton) {
        skinnedMeshRef.current.skeleton.update();
      }
      return; // 승리 애니메이션 중에는 일반 애니메이션 스킵
    }

    // 승리 애니메이션이 끝난 팀 (패배 팀) - idle 상태 유지
    if (isEnding && !isWinner) {
      // Idle 상태로 서서히 전환
      if (groupRef.current) {
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, delta * 2);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 2);
      }
      if (bones[0]) {
        bones[0].rotation.x = THREE.MathUtils.lerp(bones[0].rotation.x, 0, delta * 2);
        bones[0].rotation.z = THREE.MathUtils.lerp(bones[0].rotation.z, 0, delta * 2);
      }
      const idleAngle = 5 * DEG_TO_RAD;
      bones.forEach((bone, index) => {
        if (!bone || index === 0) return;
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, -idleAngle, delta * 2);
      });
      if (skinnedMeshRef.current?.skeleton) {
        skinnedMeshRef.current.skeleton.update();
      }
      return;
    }

    // === 일반 게임 중 애니메이션 ===
    // Start animation when intensity is high enough
    if (intensity > 0.05 && !animState.isAnimating) {
      animState.isAnimating = true;
      animState.phase = 1;
      animState.progress = 0;
      animState.currentShoulder = 1; // Start with left shoulder
    }

    // Stop animation when intensity drops
    if (intensity <= 0.05 && animState.isAnimating && animState.phase === 0) {
      animState.isAnimating = false;
    }

    // Animation speed based on intensity
    const baseSpeed = 0.8;
    const speedMultiplier = 1 + intensity * 2;
    const animSpeed = baseSpeed * speedMultiplier;

    // Easing function for smooth motion
    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    if (animState.isAnimating) {
      animState.progress += delta * animSpeed;

      const phaseTime = 0.6; // Slightly longer for more realistic motion

      if (animState.progress >= phaseTime) {
        animState.progress = 0;
        animState.phase++;

        // Cycle: pump(1) -> wind(2) -> switch shoulder -> repeat
        if (animState.phase > 2) {
          if (intensity > 0.05) {
            animState.phase = 1;
            animState.currentShoulder *= -1; // Switch shoulders
          } else {
            animState.phase = 0;
            animState.isAnimating = false;
          }
        }
      }

      const phaseProgress = animState.progress / phaseTime;
      const shoulder = animState.currentShoulder;

      // Calculate animation values based on phase
      let pumpProgress = 0;    // 0 = base, 1 = pumped
      let bendIntensity = 0;

      switch (animState.phase) {
        case 1: // PUMP - 낚싯대 세우기
          pumpProgress = easeInOut(phaseProgress);
          bendIntensity = easeInOut(phaseProgress);
          break;
        case 2: // WIND - 낚싯대 내리며 릴링
          pumpProgress = 1 - easeInOut(phaseProgress);
          bendIntensity = 1 - easeInOut(phaseProgress);
          break;
        default:
          pumpProgress = 0;
          bendIntensity = 0;
      }

      // Apply mirror for Team B
      const shoulderDir = mirrored ? -shoulder : shoulder;

      // === Position: Move entire rod to shoulder ===
      const sideOffset = shoulderDir * pumpProgress * 0.35;
      const liftHeight = pumpProgress * 0.25;

      if (groupRef.current) {
        groupRef.current.position.x = sideOffset;
        groupRef.current.position.y = liftHeight;
      }

      // === Root bone rotation: Pump angle + shoulder tilt ===
      if (bones[0]) {
        const pumpRotation = -pumpProgress * PUMP_DELTA;
        const shoulderTilt = shoulderDir * pumpProgress * 0.15;
        bones[0].rotation.x = pumpRotation;
        bones[0].rotation.z = shoulderTilt;
      }

      // === 원호 형태로 휘어짐 (각 본이 균등하게 회전) ===
      const totalArcAngle = pumpProgress * (150 * DEG_TO_RAD);  // 최대 150도 원호
      const boneCount = bones.length - 1;  // 루트 본 제외
      const anglePerBone = totalArcAngle / boneCount;

      bones.forEach((bone, index) => {
        if (!bone || index === 0) return;
        // 음수 = 안쪽(낚싯줄 방향)으로 휘어짐
        bone.rotation.z = -anglePerBone;
      });

      // Store values for fishing line
      animValuesRef.current.bendIntensity = bendIntensity;
      animValuesRef.current.sideOffset = sideOffset;

      // Get actual tip bone world position for fishing line attachment
      if (onTipPositionUpdate && tipBoneRef.current) {
        tipBoneRef.current.getWorldPosition(tipWorldPos);
        onTipPositionUpdate({
          x: tipWorldPos.x,
          y: tipWorldPos.y,
          z: tipWorldPos.z,
          bendIntensity,
          sideOffset,
        });
      }
    } else {
      // Idle - lerp back to rest position
      if (groupRef.current) {
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, delta * 3);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 3);
      }

      // 루트 본 회전은 0으로 복귀
      if (bones[0]) {
        bones[0].rotation.x = THREE.MathUtils.lerp(bones[0].rotation.x, 0, delta * 3);
        bones[0].rotation.z = THREE.MathUtils.lerp(bones[0].rotation.z, 0, delta * 3);
      }

      // Idle 시 약간의 휘어짐만 유지
      const idleAnglePerBone = 5 * DEG_TO_RAD;
      bones.forEach((bone, index) => {
        if (!bone || index === 0) return;
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, -idleAnglePerBone, delta * 3);
        bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, 0, delta * 3);
      });

      // Update for idle state
      animValuesRef.current.bendIntensity = THREE.MathUtils.lerp(animValuesRef.current.bendIntensity, 0.1, delta * 3);
      animValuesRef.current.sideOffset = THREE.MathUtils.lerp(animValuesRef.current.sideOffset, 0, delta * 3);

      // Get actual tip bone world position for fishing line attachment
      if (onTipPositionUpdate && tipBoneRef.current) {
        tipBoneRef.current.getWorldPosition(tipWorldPos);
        onTipPositionUpdate({
          x: tipWorldPos.x,
          y: tipWorldPos.y,
          z: tipWorldPos.z,
          bendIntensity: animValuesRef.current.bendIntensity,
          sideOffset: animValuesRef.current.sideOffset,
        });
      }
    }

    // Update skeleton after bone changes
    if (skinnedMeshRef.current?.skeleton) {
      skinnedMeshRef.current.skeleton.update();
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={clonedScene}
        scale={0.8}
        position={[0, -0.8, 0]}
        rotation={[-BASE_ANGLE, 0, 0]}
      />
    </group>
  );
}

/**
 * FishingRod3D - Complete 3D fishing scene for one team (PLAYING 전용)
 * @param {string} team - 'A' or 'B'
 * @param {string} className - 추가 CSS 클래스
 * @param {boolean} isWinner - 이 팀이 승리 팀인지
 * @param {boolean} isEnding - 게임 종료 연출 중인지
 * @param {function} onVictoryComplete - 승리 애니메이션 완료 콜백
 */
export function FishingRod3D({ team, className = '', isWinner = false, isEnding = false, onVictoryComplete }) {
  const mirrored = team === 'B';
  const [tipPosition, setTipPosition] = useState({
    x: 0,
    y: 0.8,
    z: -0.5,
    bendIntensity: 0,
    sideOffset: 0,
    victoryProgress: 0,
  });

  // 승리 애니메이션 완료 감지
  useEffect(() => {
    if (isEnding && isWinner && tipPosition.victoryProgress >= 1 && onVictoryComplete) {
      onVictoryComplete();
    }
  }, [isEnding, isWinner, tipPosition.victoryProgress, onVictoryComplete]);

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas shadows>
        {/* Camera - Game View settings */}
        <PerspectiveCamera
          makeDefault
          position={[0, 0.4, 1.2]}
          fov={75}
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
        <FishingRodModel
          team={team}
          mirrored={mirrored}
          onTipPositionUpdate={setTipPosition}
          isWinner={isWinner}
          isEnding={isEnding}
        />

        {/* Fishing Line - from rod tip to water target */}
        <FishingLine
          rodTipPosition={tipPosition}
          bendIntensity={tipPosition.bendIntensity}
        />

        {/* Background fog */}
        <fog attach="fog" args={['#87CEEB', 10, 50]} />
      </Canvas>
    </div>
  );
}

// Preload the GLB
useGLTF.preload(rodGlb);

export default FishingRod3D;
