import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Environment, OrbitControls, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import rodGlb from '../assets/rod2.glb';

// Bone names from the GLB file (no dots in names)
const BONE_NAMES = ['본', '본001', '본002', '본003', '본004'];

// Angle constants (in radians)
const DEG_TO_RAD = Math.PI / 180;
const BASE_ANGLE = 30 * DEG_TO_RAD;     // 준비 자세: 76도 (거의 수직)
const PUMP_ANGLE = 5 * DEG_TO_RAD;     // 펌프 최대: 85도 (더 세움)
const PUMP_DELTA = PUMP_ANGLE - BASE_ANGLE; // 펌프 시 추가 각도 (15도)

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
 * Interactive Fishing Rod Model for testing
 * Implements realistic Pump & Wind technique:
 * - Set: 45° base angle
 * - Pump: Raise to 60-70° while pulling fish
 * - Wind: Lower back to 45° while reeling
 */
function FishingRodModel({ intensity, isAnimating, mirrored = false, onTipPositionUpdate }) {
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
  });

  // Animation output values for fishing line
  const animValuesRef = useRef({
    bendIntensity: 0,
    sideOffset: 0,
  });

  // Vectors for world position calculation
  const tipWorldPos = useMemo(() => new THREE.Vector3(), []);
  const rootWorldPos = useMemo(() => new THREE.Vector3(), []);
  const dirToTarget = useMemo(() => new THREE.Vector3(), []);

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
  useFrame((state, delta) => {
    const bones = bonesRef.current;
    if (!bones.length) return;

    const animState = animationStateRef.current;

    // Start animation when isAnimating is true
    if (isAnimating && !animState.isAnimating) {
      animState.isAnimating = true;
      animState.phase = 1;
      animState.progress = 0;
      animState.currentShoulder = 1; // Start with left shoulder
    }

    // Stop animation when not animating
    if (!isAnimating && animState.isAnimating) {
      animState.isAnimating = false;
      animState.phase = 0;
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

        // Cycle: pump(1) -> wind(2) -> pump to other shoulder(3) -> wind(4) -> repeat
        if (animState.phase > 2) {
          animState.phase = 1;
          animState.currentShoulder *= -1; // Switch shoulders
        }
      }

      const phaseProgress = animState.progress / phaseTime;
      const shoulder = animState.currentShoulder;

      // Calculate animation values based on phase
      let pumpProgress = 0;    // 0 = base (45°), 1 = pumped (65°)
      let bendIntensity = 0;

      switch (animState.phase) {
        case 1: // PUMP - 낚싯대 세우기 (45° → 65°)
          pumpProgress = easeInOut(phaseProgress);
          bendIntensity = easeInOut(phaseProgress);
          break;
        case 2: // WIND - 낚싯대 내리며 릴링 (65° → 45°)
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
      // 어깨 방향으로 낚싯대 전체 이동
      const sideOffset = shoulderDir * pumpProgress * 0.35;
      const liftHeight = pumpProgress * 0.25;

      if (groupRef.current) {
        groupRef.current.position.x = sideOffset;
        groupRef.current.position.y = liftHeight;
      }

      // === Root bone rotation: Pump angle + shoulder tilt ===
      if (bones[0]) {
        // 펌프 각도: 낚싯대를 세움 (음수 = 뒤로 기울임)
        const pumpRotation = -pumpProgress * PUMP_DELTA;

        // 어깨 방향 기울기
        const shoulderTilt = shoulderDir * pumpProgress * 0.15;

        bones[0].rotation.x = pumpRotation;
        bones[0].rotation.z = shoulderTilt;
      }

      // === 원호 형태로 휘어짐 (각 본이 균등하게 회전) ===
      // 펌프할수록 낚싯대가 세워지므로, 끝이 물고기를 향하려면 더 많이 휘어야 함
      // 각 본이 동일한 각도로 회전하면 자연스러운 원호가 됨

      // 펌프 시 총 휘어짐 각도 (라디안)
      // 예: 120도 휘어짐 = 2.09 rad, 4개 본이면 각 본당 ~30도(0.52 rad)
      const totalArcAngle = pumpProgress * (150 * DEG_TO_RAD);  // 최대 150도 원호
      const boneCount = bones.length - 1;  // 루트 본 제외
      const anglePerBone = totalArcAngle / boneCount;  // 각 본당 회전량

      bones.forEach((bone, index) => {
        if (!bone || index === 0) return;
        // 각 본이 동일한 각도로 회전 → 원호 형성
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
      // 위치는 중앙으로 복귀
      if (groupRef.current) {
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, delta * 3);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 3);
      }

      // 루트 본 회전은 0으로 복귀
      if (bones[0]) {
        bones[0].rotation.x = THREE.MathUtils.lerp(bones[0].rotation.x, 0, delta * 3);
        bones[0].rotation.z = THREE.MathUtils.lerp(bones[0].rotation.z, 0, delta * 3);
      }

      // Idle 시 거의 곧게 서있음 (약간의 휘어짐만)
      // 각 본당 약 5도씩 휘어짐 → 총 약 20도 원호
      const idleAnglePerBone = 5 * DEG_TO_RAD;
      bones.forEach((bone, index) => {
        if (!bone || index === 0) return;
        // 음수 = 안쪽(낚싯줄 방향)으로 휘어짐
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, -idleAnglePerBone, delta * 3);
        bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, 0, delta * 3);  // X축은 0으로
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
      {/* 낚싯대 - 더 크게 확대, 기본 45도 각도 (끝이 바다 방향으로) */}
      <primitive
        object={clonedScene}
        scale={0.8}  // 0.5 → 0.8 확대
        position={[0, -0.8, 0]}  // 위치 조정
        rotation={[-BASE_ANGLE, mirrored ? Math.PI : 0, 0]}  // 음수 = 끝이 앞쪽(바다)으로 향함
      />
    </group>
  );
}

/**
 * Water/Ocean plane with fish target indicator
 */
function Ocean() {
  return (
    <group>
      {/* Ocean surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, -5]}>
        <planeGeometry args={[50, 30]} />
        <meshStandardMaterial
          color="#1e40af"
          transparent
          opacity={0.8}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>
      {/* Fish target indicator (where the line ends) */}
      <mesh position={[WATER_TARGET.x, WATER_TARGET.y + 0.05, WATER_TARGET.z]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff0000" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Main Test Component
 */
// Camera presets - closer to rod for more immersive view
const CAMERA_PRESETS = {
  test: { position: [1.2, 0.8, 1.8], target: [0, 0.2, -0.5], fov: 60 },
  game: { position: [0, 0.4, 1.2], target: [0, 0.1, -0.5], fov: 75 },
};

export default function FishingRodTest() {
  const [intensity, setIntensity] = useState(0.5);
  const [isAnimating, setIsAnimating] = useState(false);
  const [autoShake, setAutoShake] = useState(false);
  const [shakeInterval, setShakeInterval] = useState(200);
  const [cameraMode, setCameraMode] = useState('test');
  const [tipPosition, setTipPosition] = useState({ x: 0, y: 0.8, z: -0.5, bendIntensity: 0, sideOffset: 0 });
  const intervalRef = useRef(null);

  const currentCamera = CAMERA_PRESETS[cameraMode];

  // Auto shake simulation
  useEffect(() => {
    if (autoShake) {
      setIsAnimating(true);
      intervalRef.current = setInterval(() => {
        setIntensity(prev => {
          const variation = (Math.random() - 0.5) * 0.2;
          return Math.max(0.1, Math.min(1, prev + variation));
        });
      }, shakeInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoShake, shakeInterval]);

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-sky-400 to-blue-600 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-black/50 text-white">
        <h1 className="text-2xl font-bold">Fishing Rod Animation Test</h1>
        <p className="text-sm text-gray-300">낚싯대 Pump & Wind 애니메이션 테스트</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas shadows key={cameraMode}>
            <PerspectiveCamera
              makeDefault
              position={currentCamera.position}
              fov={currentCamera.fov}
            />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              target={currentCamera.target}
            />

            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
            <directionalLight position={[-5, 5, -5]} intensity={0.3} />

            <Environment preset="sunset" />

            <Suspense fallback={null}>
              <FishingRodModel
                intensity={intensity}
                isAnimating={isAnimating}
                mirrored={false}
                onTipPositionUpdate={setTipPosition}
              />

              {/* Fishing Line - 낚싯대 끝에서 고정된 바다 지점까지 */}
              <FishingLine
                rodTipPosition={tipPosition}
                bendIntensity={tipPosition.bendIntensity}
              />
            </Suspense>

            {/* Ocean */}
            <Ocean />

            {/* Ground grid for reference */}
            <Grid
              args={[10, 10]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#6b7280"
              sectionSize={2}
              sectionThickness={1}
              sectionColor="#9ca3af"
              fadeDistance={15}
              fadeStrength={1}
              followCamera={false}
              position={[0, -1.5, 0]}
            />

            <fog attach="fog" args={['#87CEEB', 10, 50]} />
          </Canvas>

          {/* Animation Phase Indicator */}
          <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm">
            <div>Status: {isAnimating ? 'Animating' : 'Idle'}</div>
            <div>Intensity: {(intensity * 100).toFixed(0)}%</div>
            <div>Speed: {(1 + intensity * 2).toFixed(1)}x</div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="w-80 bg-gray-900 text-white p-4 space-y-4 overflow-y-auto">
          <h2 className="text-lg font-bold border-b border-gray-700 pb-2">Controls</h2>

          {/* Camera Mode Toggle */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Camera View</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCameraMode('test')}
                className={`py-2 rounded-lg font-bold transition-all ${
                  cameraMode === 'test'
                    ? 'bg-purple-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Test View
              </button>
              <button
                onClick={() => setCameraMode('game')}
                className={`py-2 rounded-lg font-bold transition-all ${
                  cameraMode === 'game'
                    ? 'bg-purple-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Game View
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {cameraMode === 'game' ? '1인칭 게임 시점' : '테스트용 회전 시점'}
            </p>
          </div>

          {/* Manual Animation Toggle */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Animation</label>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`w-full py-3 rounded-lg font-bold transition-all ${
                isAnimating
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isAnimating ? 'Stop Animation' : 'Start Animation'}
            </button>
          </div>

          {/* Intensity Slider */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">
              Intensity (Shake Frequency): {(intensity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Auto Shake */}
          <div className="space-y-2 pt-4 border-t border-gray-700">
            <label className="text-sm text-gray-400">Auto Shake Simulation</label>
            <button
              onClick={() => setAutoShake(!autoShake)}
              className={`w-full py-2 rounded-lg font-bold transition-all ${
                autoShake
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {autoShake ? 'Stop Auto Shake' : 'Start Auto Shake'}
            </button>
          </div>

          {/* Shake Interval */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">
              Shake Interval: {shakeInterval}ms
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={shakeInterval}
              onChange={(e) => setShakeInterval(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-2 pt-4 border-t border-gray-700">
            <label className="text-sm text-gray-400">Quick Presets</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setIntensity(0.2); setIsAnimating(true); }}
                className="py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Gentle
              </button>
              <button
                onClick={() => { setIntensity(0.5); setIsAnimating(true); }}
                className="py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Normal
              </button>
              <button
                onClick={() => { setIntensity(0.8); setIsAnimating(true); }}
                className="py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Fast
              </button>
              <button
                onClick={() => { setIntensity(1.0); setIsAnimating(true); }}
                className="py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Maximum
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="pt-4 border-t border-gray-700 text-xs text-gray-500 space-y-1">
            <p><strong>실제 펌프 앤 와인드:</strong></p>
            <p className="pt-1"><strong>1. 준비 (Set):</strong> 45° 유지</p>
            <p><strong>2. 펌프 (Pump):</strong> 45° → 65°</p>
            <p className="pl-2">- 낚싯대 세우며 물고기 당김</p>
            <p className="pl-2">- 어깨 방향으로 이동</p>
            <p><strong>3. 와인드 (Wind):</strong> 65° → 45°</p>
            <p className="pl-2">- 낚싯대 내리며 릴링</p>
            <p><strong>4. 반복:</strong> 좌우 어깨 번갈아</p>
            <p className="pt-2"><strong>낚싯줄:</strong></p>
            <p>- 낚싯대 끝에서 바다까지 연결</p>
            <p>- 펌프 시 텐션으로 휘어짐</p>
          </div>
        </div>
      </div>
    </div>
  );
}
