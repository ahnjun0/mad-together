import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import rodGlb from '../assets/rod.glb';

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

  // Animation loop: single cast motion based on incoming power
  useFrame((state, delta) => {
    const bones = bonesRef.current;
    if (!bones.length) return;

    const animState = animationStateRef.current;
    const inputPower = typeof power === 'number' ? power : 0;

    // 새 power가 들어오면 캐스팅 애니메이션 시작
    if (!animState.isCasting && inputPower > 0) {
      animState.isCasting = true;
      animState.progress = 0;
      animState.activePower = Math.max(0, Math.min(inputPower, 100));
    }

    if (animState.isCasting) {
      const normalized = animState.activePower / 100;
      // 전체 캐스팅 모션을 약 3초로 늘려 좀 더 드라마틱하게 연출
      const totalDuration = 3.0; // ~3초
      animState.progress = Math.min(animState.progress + delta, totalDuration);

      const t = animState.progress / totalDuration;

      // 0.0~0.35: 백스윙, 0.35~0.75: 포워드 스윙, 0.75~1.0: 감쇠
      let pumpAngle = 0;
      let bendIntensity = 0;
      const easeInOut = (v) =>
        v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;

      if (t < 0.35) {
        const phaseT = t / 0.35;
        pumpAngle = -easeInOut(phaseT) * 0.5 * normalized;
        bendIntensity = easeInOut(phaseT) * 0.5 * normalized;
      } else if (t < 0.75) {
        const phaseT = (t - 0.35) / 0.4;
        pumpAngle = THREE.MathUtils.lerp(
          -0.5 * normalized,
          0.6 * normalized,
          easeInOut(phaseT),
        );
        bendIntensity = THREE.MathUtils.lerp(
          0.5 * normalized,
          1.0 * normalized,
          easeInOut(phaseT),
        );
      } else {
        const phaseT = (t - 0.75) / 0.25;
        pumpAngle = THREE.MathUtils.lerp(
          0.6 * normalized,
          0,
          easeInOut(phaseT),
        );
        bendIntensity = THREE.MathUtils.lerp(
          1.0 * normalized,
          0,
          easeInOut(phaseT),
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
        const bendAmount = bendIntensity * boneWeight * 0.2;
        bone.rotation.x = bendAmount;
      });

      // 종료 시점에 상태 초기화
      if (animState.progress >= totalDuration) {
        animState.isCasting = false;
        animState.progress = 0;
        animState.activePower = 0;
      }
    } else {
      // 캐스팅이 아닐 때는 서서히 원위치로 복귀
      bones.forEach((bone) => {
        if (!bone) return;
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
 * CastingRod3D - 3D casting scene for one team
 * power(0-100)에 따라 캐스팅 모션 강도가 달라짐
 */
export function CastingRod3D({ team, className = '', power = 0 }) {
  const mirrored = team === 'B';

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas shadows>
        {/* Camera - 살짝 더 가깝게 당겨서 몰입감 향상 */}
        <PerspectiveCamera
          makeDefault
          position={[0, 0.4, 1.5]}
          fov={70}
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

        {/* The casting fishing rod */}
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

