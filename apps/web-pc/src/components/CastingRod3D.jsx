import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import rodGlb from '../assets/rod2.glb';

// Bone names from the GLB file (no dots in names)
const BONE_NAMES = ['본', '본001', '본002', '본003', '본004'];

/**
 * CastingRod model component with bone animation
 * - Single cast motion driven purely by power(0-100)
 */
function CastingRodModel({ team, mirrored = false, power = 0 }) {
  const { scene } = useGLTF(rodGlb);
  const groupRef = useRef();
  const bonesRef = useRef([]);
  const skinnedMeshRef = useRef(null);
  const animationStateRef = useRef({
    progress: 0,
    isCasting: false,
    activePower: 0,
    hasStarted: false, // 최초 1회만 실행하기 위한 플래그
  });

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

  // Animation loop: single cast motion based on incoming power (최초 1회만)
  useFrame((state, delta) => {
    const bones = bonesRef.current;
    if (!bones.length) return;

    const animState = animationStateRef.current;
    const inputPower = typeof power === 'number' ? power : 0;

    // 최초 power 수신 시 1회만 실행하고 이후 무시
    if (!animState.hasStarted && inputPower > 0) {
      animState.isCasting = true;
      animState.hasStarted = true;
      animState.progress = 0;
      animState.activePower = Math.max(0, Math.min(inputPower, 100));
      console.log('[CastingRod3D] 🎣 Animation started with power:', animState.activePower);
    }

    if (animState.isCasting) {
      const normalized = animState.activePower / 100;
      
      // Power에 따른 duration 계산
      // 백스윙(0.6초) + 스윙(0.8초) + 줄 날아가기(1.5~3.5초)
      const lineDuration = 1.5 + (normalized * 2); // 1.5~3.5초 (power에 따라 차이)
      const totalDuration = 0.6 + 0.8 + lineDuration;
      
      animState.progress = Math.min(animState.progress + delta, totalDuration);
      const t = animState.progress / totalDuration;

      // 단계별 시간 비율 계산
      const backswingEnd = 0.6 / totalDuration;
      const swingEnd = (0.6 + 0.8) / totalDuration;

      let pumpAngle = 0;
      let bendIntensity = 0;
      const easeInOut = (v) =>
        v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
      const easeOutQuad = (v) => 1 - (1 - v) * (1 - v);

      // 1단계: 백스윙 - 뒤로 당겨짐 (부드러운 시작)
      if (t < backswingEnd) {
        const phaseT = t / backswingEnd;
        const backswingAngle = -0.4 * normalized; // 백스윙 최대 각도
        pumpAngle = easeInOut(phaseT) * backswingAngle;
        bendIntensity = easeInOut(phaseT) * 0.4 * normalized;
      } 
      // 2단계: 포워드 스윙 - 앞으로 던지기 (백스윙 끝 각도에서 자연스럽게 연결)
      else if (t < swingEnd) {
        const phaseT = (t - backswingEnd) / (swingEnd - backswingEnd);
        const backswingAngle = -0.4 * normalized; // 백스윙 끝 각도
        const swingAngle = (0.8 + normalized * 0.4); // 스윙 최대 각도 (power에 따라 0.8~1.2)
        
        // 백스윙 끝에서 스윙으로 부드럽게 전환 (easeOutQuad 사용)
        pumpAngle = THREE.MathUtils.lerp(
          backswingAngle,
          swingAngle,
          easeOutQuad(phaseT)
        );
        
        bendIntensity = THREE.MathUtils.lerp(
          0.4 * normalized,
          1.5 * normalized, // 스윙 시 더 큰 휘어짐
          easeOutQuad(phaseT)
        );
      } 
      // 3단계: 줄 날아가기 - 던진 자세 유지하며 줄이 날아감 (power에 따라 시간 차이)
      else {
        const phaseT = (t - swingEnd) / (1 - swingEnd);
        const holdAngle = 0.5 + (normalized * 0.3); // 던진 자세 (power에 따라 0.5~0.8)
        
        pumpAngle = THREE.MathUtils.lerp(
          0.8 + normalized * 0.4,
          holdAngle,
          easeInOut(phaseT)
        );
        
        bendIntensity = THREE.MathUtils.lerp(
          1.5 * normalized,
          0.4 * normalized, // 자세 유지하며 긴장 완화
          easeInOut(phaseT)
        );
      }

      if (mirrored) {
        pumpAngle = -pumpAngle;
      }

      if (bones[0]) {
        bones[0].rotation.z = pumpAngle;
      }

      bones.forEach((bone, index) => {
        if (!bone || index === 0) return;
        const boneWeight = index / (bones.length - 1);
        const bendAmount = bendIntensity * boneWeight * 0.3;
        bone.rotation.x = bendAmount;
      });

      // 종료 시점에 상태 유지 (원위치로 돌아가지 않음)
      if (animState.progress >= totalDuration) {
        animState.isCasting = false;
        console.log('[CastingRod3D] ✅ Animation completed');
      }
    }

    // Update skeleton after bone changes
    if (skinnedMeshRef.current?.skeleton) {
      skinnedMeshRef.current.skeleton.update();
    }
  });

  return (
    <group ref={groupRef}>
      {/* PlayingView의 FishingRod3D와 비슷한 스케일/위치로 조정 */}
      <primitive
        object={clonedScene}
        scale={0.8}
        position={[0, -0.8, 0]}
        rotation={[0.1, mirrored ? Math.PI : 0, 0]}
      />
    </group>
  );
}

/**
 * CastingRod3D - 3D casting scene for one team
 * power(0-100)에 따라 캐스팅 모션 강도가 달라짐
 */
export function CastingRod3D({ team, className = '', power = 0 }) {
  const mirrored = false;

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas shadows>
        {/* Camera - PlayingView의 FishingRod3D와 유사한 시점으로 맞춤 */}
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

        {/* The casting fishing rod - PlayingView와 유사한 배치로 조정 */}
        <CastingRodModel team={team} mirrored={mirrored} power={power} />

        {/* Optional: Ocean/sky background gradient via fog */}
        <fog attach="fog" args={['#87CEEB', 10, 50]} />
      </Canvas>
    </div>
  );
}

// Preload the GLB
useGLTF.preload(rodGlb);

export default CastingRod3D;

