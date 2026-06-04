import React, { useRef, useMemo, useState, useEffect, useCallback, memo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';

import * as THREE from 'three';
import {
  BLOCK_W,
  BLOCK_H,
  BLOCK_D,
  LAYER_GAP,
  BLOCKS_PER_LAYER,
  STEP,
  WOOD_COLORS,
  BLOCK_PHYSICS
} from './towerConfig';
import ParticleEffect from './ParticleEffect';
import { getBlockMaterialProps, getEnvironmentTheme } from './blockTextures';
import { physicsOptimizer } from './physicsOptimizer';
import { getPhysicsSettingsForMobile, getDynamicBlockLimit } from './mobileOptimizations';
import { profiler } from './performanceProfiler';

// ─── Shared geometries ───
const sharedBlockGeometry = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D);
const sharedEdgesGeometry = new THREE.EdgesGeometry(sharedBlockGeometry);

// ─── Edges component with theme-aware color ───
function Edges({ edgeColor = '#3a2010' }) {
  const edgeMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: edgeColor }), [edgeColor]);

  // Dispose old material when edgeColor changes or component unmounts
  useEffect(() => {
    return () => {
      edgeMaterial.dispose();
    };
  }, [edgeMaterial]);

  return (
    <lineSegments geometry={sharedEdgesGeometry} material={edgeMaterial} raycast={() => null} />
  );
}

// ─── Reusable math objects (avoid per-frame allocations) ───
const _q = new THREE.Quaternion();
const _euler = new THREE.Euler();

const Block = memo(function Block({
  id,
  position,
  rotation,
  color,
  onClick,
  isSelected,
  isGhost,
  onRigidRef,
  isDynamic = false,
  theme = 'classic',
  isKeyboardFocused = false,
  lowPowerMode = false,
}) {
  const rigidRef = useRef(null);
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Создаём material один раз при монтировании (устранение 54 аллокаций за рендер)
  if (!materialRef.current) {
    materialRef.current = new THREE.MeshStandardMaterial();
  }

  useEffect(() => {
    if (onRigidRef && rigidRef.current) onRigidRef(id, rigidRef.current);
  }, [id, onRigidRef]);

  // Combine body type, position, rotation, and velocity sync into a single effect
  useEffect(() => {
    const body = rigidRef.current;
    if (!body) return;
    // Set body type based on dynamic flag
    body.setBodyType(isDynamic ? 0 : 1, true);
    // Sync position & rotation
    body.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
    _q.setFromEuler(_euler.set(rotation[0], rotation[1], rotation[2]));
    body.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
    // Reset velocities to avoid residual momentum
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }, [position, rotation, isDynamic]);

  // Ghost block: selected block shown semi-transparent to indicate it's "lifted"
  const opacity = isGhost ? 0.35 : 1;

  // ─── Procedural texture material props ───
  const materialProps = useMemo(() => (
    lowPowerMode
      ? {
          roughness: 0.72,
          metalness: 0,
          emissiveDefault: '#000000',
          emissiveIntensityDefault: 0,
        }
      : getBlockMaterialProps(theme, color)
  ), [theme, color, lowPowerMode]);

  // ─── Императивное обновление материала (устранение per-render allocation) ───
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;

    // Textures (только если не lowPowerMode)
    if (lowPowerMode) {
      mat.map = null;
      mat.normalMap = null;
      mat.roughnessMap = null;
    } else {
      mat.map = materialProps.map || null;
      mat.normalMap = materialProps.normalMap || null;
      mat.roughnessMap = materialProps.roughnessMap || null;
    }

    // Basic properties
    if (lowPowerMode) {
      mat.color.set(color);
    } else {
      mat.color.set('#ffffff'); // Текстура определяет цвет
    }
    mat.roughness = materialProps.roughness;
    mat.metalness = materialProps.metalness;

    // Transparency
    mat.transparent = isGhost;
    mat.opacity = opacity;

    // Emissive (selection/hover/focus states)
    const emissiveColor = isSelected ? '#4488ff' : (isKeyboardFocused ? '#ffcc00' : (isHovered ? '#88ccff' : materialProps.emissiveDefault));
    const emissiveIntensity = isSelected ? 0.3 : (isKeyboardFocused ? 0.25 : (isHovered ? 0.15 : (materialProps.emissiveIntensityDefault || 0)));
    mat.emissive.set(emissiveColor);
    mat.emissiveIntensity = emissiveIntensity;

    mat.needsUpdate = true;
  }, [color, materialProps, isGhost, opacity, isSelected, isKeyboardFocused, isHovered, lowPowerMode]);

  // Dispose material on unmount
  useEffect(() => {
    return () => {
      if (materialRef.current) {
        materialRef.current.dispose();
        materialRef.current = null;
      }
    };
  }, []);

  // Edge color depends on theme — вычисляем один раз через useMemo
  const edgeColor = useMemo(() => {
    const EDGE_COLOR_MAP = {
      neon: color,
      marble: '#8a7a6a',
      ice: '#88c8e8',
      bamboo: '#5d962d',
      candy: color,
    };
    return EDGE_COLOR_MAP[theme] ?? '#3a2010';
  }, [theme, color]);

  // Мемоизированные обработчики (устранение inline функций)
  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    if (!isDynamic && !isGhost) {
      onClick(id);
    }
  }, [id, onClick, isDynamic, isGhost]);

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation();
    setIsHovered(true);
  }, []);

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation();
    setIsHovered(false);
  }, []);

  return (
    <RigidBody
      ref={rigidRef}
      type={isDynamic ? "dynamic" : "fixed"}
      position={position}
      rotation={rotation}
      colliders={false}
      mass={BLOCK_PHYSICS.mass}
      linearDamping={BLOCK_PHYSICS.linearDamping}
      angularDamping={BLOCK_PHYSICS.angularDamping}
      userData={{ id }}
    >
      <CuboidCollider
        args={[BLOCK_W / 2, BLOCK_H / 2, BLOCK_D / 2]}
        restitution={BLOCK_PHYSICS.restitution}
        friction={BLOCK_PHYSICS.friction}
      />
      <mesh
        ref={meshRef}
        geometry={sharedBlockGeometry}
        material={materialRef.current}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {(!lowPowerMode || isSelected || isKeyboardFocused) && <Edges edgeColor={edgeColor} />}
      </mesh>
    </RigidBody>
  );
});

// ─── Drop slot: clickable placement zone on top of tower ───
const DropSlot = memo(function DropSlot({ position, rotation, slotIndex, onClick, isDragHover = false }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef();
  const isHighlighted = hovered || isDragHover;

  // Pulsing animation
  useFrame((state) => {
    if (groupRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.03;
      groupRef.current.position.y = position[1] + pulse;
    }
  });

  // Single material instance — update color imperatively to avoid recreation
  const lineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#2a6eff', linewidth: 1 }),
    []
  );

  // Update material properties when highlight state changes
  useEffect(() => {
    lineMaterial.color.set(isHighlighted ? '#44ff88' : '#2a6eff');
    lineMaterial.linewidth = isHighlighted ? 3 : 1;
    lineMaterial.needsUpdate = true;
  }, [isHighlighted, lineMaterial]);

  useEffect(() => {
    return () => { lineMaterial.dispose(); };
  }, [lineMaterial]);
  
  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh
        geometry={sharedBlockGeometry}
        onClick={(e) => { e.stopPropagation(); onClick(slotIndex); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      >
        <meshStandardMaterial
          color={isHighlighted ? '#44ff88' : '#2a6eff'}
          transparent
          opacity={isHighlighted ? 0.7 : 0.3}
          emissive={isHighlighted ? '#44ff88' : '#2a6eff'}
          emissiveIntensity={isHighlighted ? 0.6 : 0.15}
        />
      </mesh>
      {/* Glow outline */}
      <lineSegments geometry={sharedEdgesGeometry} material={lineMaterial} raycast={() => null} />
    </group>
  );
});

// ─── Scene environment (theme-aware) ───
function GroundSurface({ envTheme, lowPowerMode = false }) {
  const theme = getEnvironmentTheme(envTheme);

  const groundTexture = useMemo(() => {
    if (lowPowerMode) return null;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = theme.groundColor;
    ctx.fillRect(0, 0, size, size);

    // radial gradient — darker edges, lighter center under tower
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // subtle noise
    for (let x = 0; x < size; x += 4) {
      for (let y = 0; y < size; y += 4) {
        const b = Math.random() * 0.06;
        ctx.fillStyle = `rgba(0,0,0,${b})`;
        ctx.fillRect(x, y, 4, 4);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [theme.groundColor, lowPowerMode]);

  // Освобождаем GPU-память текстуры при смене темы
  useEffect(() => {
    return () => { if (groundTexture) groundTexture.dispose(); };
  }, [groundTexture]);

  return (
    <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}>
      <circleGeometry args={[theme.groundSize / 2, lowPowerMode ? 24 : 48]} />
      <meshStandardMaterial
        color={theme.groundColor}
        roughness={theme.groundRoughness}
        metalness={theme.groundMetalness || 0}
        map={groundTexture}
      />
    </mesh>
  );
}

// ─── Ambient glow ring under the tower ───
function TowerGlow({ envTheme, lowPowerMode = false }) {
  if (lowPowerMode) return null;
  const theme = getEnvironmentTheme(envTheme);
  const glowColor = envTheme === 'space' ? '#2244aa' : (envTheme === 'library' ? '#ff9944' : '#ffcc77');

  return (
    <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[0.8, 2.2, 48]} />
      <meshBasicMaterial color={glowColor} transparent opacity={0.06} side={THREE.DoubleSide} />
    </mesh>
  );
}

function GroundCollider({ envTheme }) {
  const theme = getEnvironmentTheme(envTheme);
  const halfSize = theme.groundSize / 2;
  return (
    <RigidBody type="fixed" position={[0, -0.05, 0]}>
      <CuboidCollider args={[halfSize, 0.05, halfSize]} restitution={0} friction={0.9} />
    </RigidBody>
  );
}

function FloorCollider() {
  return (
    <RigidBody type="fixed" position={[0, -5, 0]}>
      <CuboidCollider args={[10, 0.1, 10]} restitution={0} friction={0.9} />
    </RigidBody>
  );
}

// ─── Stars for space theme ───
function SpaceStars({ lowPowerMode = false }) {
  const starsRef = useRef();
  const positions = useMemo(() => {
    const arr = [];
    const count = lowPowerMode ? 60 : 200;
    for (let i = 0; i < count; i++) {
      arr.push(
        (Math.random() - 0.5) * 30,
        Math.random() * 15 + 2,
        (Math.random() - 0.5) * 30
      );
    }
    return new Float32Array(arr);
  }, [lowPowerMode]);

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#ffffff" sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

// ─── Main Scene ───
function Scene({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, dropSlots, onDropSlot, lastMovedBlockId, lastExtractionPosition, blockTheme, envTheme, keyboardFocusId, lowPowerMode = false, maxDynamicBlocks = 10 }) {
  const rigidRefs = useRef({});
  const simulateTime = useRef(0);
  const completionCalled = useRef(false);
  const [particleBlockId, setParticleBlockId] = useState(null);

  // ─── Батчевая загрузка блоков: рендерим по 9 блоков за кадр (≈6 кадров на 54 блока)
  // Предотвращает spike первого кадра при создании 54 RigidBody одновременно.
  const [visibleCount, setVisibleCount] = useState(9);
  const visibleCountRef = useRef(9);
  // Сбрасываем батч при рестарте (длина blocks меняется только при reset)
  const prevBlocksLenRef = useRef(blocks.length);
  useEffect(() => {
    if (blocks.length !== prevBlocksLenRef.current) {
      prevBlocksLenRef.current = blocks.length;
      visibleCountRef.current = 9;
      setVisibleCount(9);
      return;
    }
    if (visibleCountRef.current >= blocks.length) return;
    const id = requestAnimationFrame(() => {
      visibleCountRef.current = Math.min(visibleCountRef.current + 9, blocks.length);
      setVisibleCount(visibleCountRef.current);
    });
    return () => cancelAnimationFrame(id);
  }, [visibleCount, blocks.length]);
  const visibleBlocks = visibleCount >= blocks.length ? blocks : blocks.slice(0, visibleCount);

  // ─── Cascading state: tracks which block IDs are currently dynamic ───
  const [cascadeDynamicIds, setCascadeDynamicIds] = useState(null);
  // Tracks the working blocks state during cascade (updated as layers settle)
  const cascadeBlocksRef = useRef(null);
  // Delay timer for cascade visual effect
  const cascadeDelayRef = useRef(0);
  const cascadeWaiting = useRef(false);

  // ─── Environment theme config ───
  const env = useMemo(() => getEnvironmentTheme(envTheme), [envTheme]);

  // ─── Show particles when block is moved ───
  useEffect(() => {
    if (lastMovedBlockId) {
      setParticleBlockId(lastMovedBlockId);
      const timer = setTimeout(() => setParticleBlockId(null), 600);
      return () => clearTimeout(timer);
    }
  }, [lastMovedBlockId]);

  const movedBlockPos = useMemo(() => {
    if (!particleBlockId) return null;
    // Используем позицию, где блок БЫЛ до извлечения, а не где он сейчас (наверху башни)
    return lastExtractionPosition;
  }, [particleBlockId, lastExtractionPosition]);

  // ─── Merge simulatingBlockIds and cascadeDynamicIds for rendering ───
  const effectiveDynamicIds = useMemo(() => {
    if (!simulatingBlockIds && !cascadeDynamicIds) return null;
    const merged = new Set();
    if (simulatingBlockIds) for (const id of simulatingBlockIds) merged.add(id);
    if (cascadeDynamicIds) for (const id of cascadeDynamicIds) merged.add(id);
    return merged.size > 0 ? merged : null;
  }, [simulatingBlockIds, cascadeDynamicIds]);

  // ─── Helper: find the next unsupported layer above the current dynamic set ───
  const findNextUnsupportedLayer = useCallback((currentBlocks, alreadyDynamicIds) => {
    // Build a set of layers that have active (non-fallen, non-dynamic) blocks
    const layerBlockCounts = {};  // layer -> count of blocks that are still "fixed" (in place)
    const layerBlocks = {};       // layer -> block ids in that layer
    let maxLayer = 0;

    for (const b of currentBlocks) {
      if (b.layer > maxLayer) maxLayer = b.layer;
      if (!layerBlocks[b.layer]) layerBlocks[b.layer] = [];
      layerBlocks[b.layer].push(b);

      // Count blocks that are NOT in the dynamic set and have NOT fallen
      if (!alreadyDynamicIds.has(b.id) && b.position[1] > -0.5) {
        layerBlockCounts[b.layer] = (layerBlockCounts[b.layer] || 0) + 1;
      }
    }

    // Find which layers are currently dynamic (to check the layer above them)
    const dynamicLayers = new Set();
    for (const b of currentBlocks) {
      if (alreadyDynamicIds.has(b.id)) {
        dynamicLayers.add(b.layer);
      }
    }

    // For each dynamic layer, check if the layer above has support
    // A layer is "unsupported" if the layer below it has 0 fixed blocks
    for (const dynLayer of dynamicLayers) {
      const layerAbove = dynLayer + 1;
      if (layerAbove > maxLayer) continue;
      if (!layerBlocks[layerAbove]) continue;

      // Check if layerAbove blocks are already dynamic
      const aboveAlreadyDynamic = layerBlocks[layerAbove].every(b => alreadyDynamicIds.has(b.id));
      if (aboveAlreadyDynamic) continue;

      // The support layer is dynLayer. Check how many fixed blocks remain in dynLayer
      const fixedInSupport = layerBlockCounts[dynLayer] || 0;
      
      // Check if dynamic blocks in this layer have actually fallen
      let supportLayerCollapsed = false;
      if (fixedInSupport === 0) {
        // No fixed blocks in support layer — check if dynamic ones have fallen
        const dynBlocksInLayer = layerBlocks[dynLayer].filter(b => alreadyDynamicIds.has(b.id));
        let allFallen = true;
        for (const b of dynBlocksInLayer) {
          const rigid = rigidRefs.current[b.id];
          if (rigid) {
            const trans = rigid.translation();
            // Check if block has dropped significantly from its original Y position
            const originalY = b.layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
            if (trans.y > originalY - 0.2) {
              allFallen = false; // Block hasn't fallen yet
              break;
            }
          }
        }
        if (allFallen || dynBlocksInLayer.length === 0) {
          supportLayerCollapsed = true;
        }
      }

      if (supportLayerCollapsed) {
        // Return the layer above as unsupported — it should cascade
        return layerAbove;
      }
    }

    return null; // No more layers to cascade
  }, []);

  // ─── Settling detection with cascade support and physics optimization ───
  useFrame((state, delta) => {
    profiler.mark('frame_start');

    const activeIds = effectiveDynamicIds;
    if (!activeIds || activeIds.size === 0 || completionCalled.current) return;

    profiler.mark('physics_start');
    // Update physics optimizer state — только когда идёт симуляция
    physicsOptimizer.updateSimulationState(true, activeIds.size);
    const cam = state.camera.position;
    physicsOptimizer.updateCameraPosition([cam.x, cam.y, cam.z]);

    // Get optimized frame parameters
    const frameParams = physicsOptimizer.getFrameParams(activeIds.size);

    // Skip physics update on low-priority frames (adaptive frame rate)
    if (!frameParams.shouldUpdatePhysics) {
      profiler.measure('frame_total', 'frame_start', 'total');
      return;
    }

    // Handle cascade delay (brief pause between layer activations for visual effect)
    if (cascadeWaiting.current) {
      cascadeDelayRef.current += delta * 1000;
      if (cascadeDelayRef.current < 150) {
        profiler.measure('frame_total', 'frame_start', 'total');
        return; // 150ms pause before next layer falls
      }
      cascadeWaiting.current = false;
      cascadeDelayRef.current = 0;
    }

    simulateTime.current += delta * 1000;
    if (simulateTime.current < 300) {
      profiler.measure('frame_total', 'frame_start', 'total');
      return;
    }

    let allSettled = true;
    const VT = frameParams.velocityThreshold;
    const VT2 = VT * VT; // сравниваем квадраты — избегаем Math.sqrt на каждый блок
    for (const id of activeIds) {
      const rigid = rigidRefs.current[id];
      if (rigid) {
        const linVel = rigid.linvel();
        const angVel = rigid.angvel();
        const linSpeed2 = linVel.x * linVel.x + linVel.y * linVel.y + linVel.z * linVel.z;
        const angSpeed2 = angVel.x * angVel.x + angVel.y * angVel.y + angVel.z * angVel.z;
        if (linSpeed2 > VT2 || angSpeed2 > VT2) {
          allSettled = false;
          break;
        }
      }
    }
    profiler.measure('physics_check', 'physics_start', 'physics');

    // Use a more conservative timeout to prevent hanging (max 5 seconds)
    const maxTimeout = Math.min(frameParams.timeout, 5000);
    if (allSettled || simulateTime.current >= maxTimeout) {
      profiler.mark('snapshot_start');
      // Snapshot current positions of dynamic blocks
      const workingBlocks = (cascadeBlocksRef.current || blocks).map(b => {
        if (activeIds.has(b.id)) {
          const rigid = rigidRefs.current[b.id];
          if (rigid) {
            const trans = rigid.translation();
            const rot = rigid.rotation();
            _q.set(rot.x, rot.y, rot.z, rot.w);
            _euler.setFromQuaternion(_q);
            return { ...b, position: [trans.x, trans.y, trans.z], rotation: [_euler.x, _euler.y, _euler.z] };
          }
        }
        return b;
      });
      profiler.measure('snapshot', 'snapshot_start', 'logic');

      // Check if there's an unsupported layer above that should cascade
      profiler.mark('cascade_check_start');
      const nextResult = findNextUnsupportedLayer(workingBlocks, activeIds);
      profiler.measure('cascade_check', 'cascade_check_start', 'logic');

      if (nextResult !== null) {
        // ─── CASCADE: activate the next unsupported layer ───
        const newDynamicIds = new Set(activeIds);
        // If nextResult is an array of IDs, use them. If it's a number (old style), handle it too.
        if (Array.isArray(nextResult)) {
          for (const id of nextResult) {
            if (id !== lastMovedBlockId) newDynamicIds.add(id);
          }
        } else {
          const nextLayer = nextResult;
          for (const b of workingBlocks) {
            if (b.layer === nextLayer && b.id !== lastMovedBlockId) {
              newDynamicIds.add(b.id);
            }
          }
        }
        cascadeBlocksRef.current = workingBlocks;
        setCascadeDynamicIds(newDynamicIds);
        simulateTime.current = 0;
        cascadeWaiting.current = true;
        cascadeDelayRef.current = 0;
        // Don't call completion — continue simulating
      } else {
        // ─── DONE: no more layers to cascade, finalize ───
        completionCalled.current = true;
        simulateTime.current = 0;
        cascadeBlocksRef.current = null;
        setCascadeDynamicIds(null);
        physicsOptimizer.updateSimulationState(false);
        // Reset all dynamic blocks to fixed state to prevent hanging blocks
        for (const id of activeIds) {
          const rigid = rigidRefs.current[id];
          if (rigid) {
            rigid.setBodyType(1, true); // 1 = fixed
          }
        }
        onSimulationComplete(workingBlocks);
      }
    }

    profiler.measure('frame_total', 'frame_start', 'total');
  });

  useEffect(() => {
    if (simulatingBlockIds && simulatingBlockIds.size > 0) {
      simulateTime.current = 0;
      completionCalled.current = false;
      cascadeBlocksRef.current = null;
      setCascadeDynamicIds(null);
      cascadeWaiting.current = false;
      cascadeDelayRef.current = 0;
    }
  }, [simulatingBlockIds]);

  useEffect(() => {
    if (!simulatingBlockIds || simulatingBlockIds.size === 0) {
      for (const b of blocks) {
        const rigid = rigidRefs.current[b.id];
        if (rigid) {
          // Ensure block is fixed (not dynamic) when simulation ends
          rigid.setBodyType(1, true);
          rigid.setTranslation({ x: b.position[0], y: b.position[1], z: b.position[2] }, true);
          _q.setFromEuler(_euler.set(b.rotation[0], b.rotation[1], b.rotation[2]));
          rigid.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
          rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
          rigid.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }
  }, [blocks, simulatingBlockIds]);

  return (
    <>
      {/* ─── Fog ─── */}
      <fog attach="fog" args={[env.fogColor, env.fogNear, env.fogFar]} />

      {/* Subtle tower base glow */}
      {!lowPowerMode && (
        <pointLight
          position={[0, 0.5, 0]}
          intensity={0.3}
          color={envTheme === 'space' ? '#4466cc' : envTheme === 'library' ? '#ff9944' : '#ffddaa'}
          distance={5}
          decay={2}
        />
      )}

      {/* ─── Lighting ─── */}
      <ambientLight intensity={env.ambientIntensity} />
      <hemisphereLight args={[env.hemiSkyColor, env.hemiGroundColor, env.hemiIntensity]} />
      {env.dirLights.slice(0, lowPowerMode ? 1 : env.dirLights.length).map((dl, i) => (
        <directionalLight
          key={`dir-${i}`}
          position={dl.position}
          intensity={dl.intensity}
          color={dl.color}
          castShadow={!lowPowerMode && env.shadowEnabled}
          shadow-mapSize-width={lowPowerMode ? 512 : 1024}
          shadow-mapSize-height={lowPowerMode ? 512 : 1024}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
      ))}
      {!lowPowerMode && env.spotLight && (
        <spotLight
          position={env.spotLight.position}
          intensity={env.spotLight.intensity}
          color={env.spotLight.color}
          angle={env.spotLight.angle}
          penumbra={env.spotLight.penumbra}
          castShadow={env.shadowEnabled}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
      )}

      {/* ─── Space stars ─── */}
      {envTheme === 'space' && <SpaceStars lowPowerMode={lowPowerMode} />}

      {/* ─── Ground ─── */}
      <GroundSurface envTheme={envTheme} />
      <GroundCollider envTheme={envTheme} />

      {/* Decorative table platform */}
      {!lowPowerMode && (
        <group>
          {/* Table top */}
          <mesh position={[0, -0.06, 0]} receiveShadow castShadow raycast={() => null}>
            <cylinderGeometry args={[2.2, 2.4, 0.08, 32]} />
            {/* eslint-disable-next-line no-nested-ternary */}
            <meshStandardMaterial
              color={{ space: '#1a1a2e', beach: '#b8956a' }[envTheme] ?? '#5a3a1a'}
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
          {/* Table leg */}
          <mesh position={[0, -1.5, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.4, 0.6, 2.8, 16]} />
            <meshStandardMaterial
              color={{ space: '#121228', beach: '#a07848' }[envTheme] ?? '#3a2210'}
              roughness={0.8}
            />
          </mesh>
          {/* Table base */}
          <mesh position={[0, -2.95, 0]} raycast={() => null}>
            <cylinderGeometry args={[1.2, 1.3, 0.1, 24]} />
            <meshStandardMaterial
              color={{ space: '#151530', beach: '#a07848' }[envTheme] ?? '#4a2a14'}
              roughness={0.75}
            />
          </mesh>
        </group>
      )}

      <FloorCollider />

      {/* Particle effect for successful move */}
      {!lowPowerMode && movedBlockPos && (
        <ParticleEffect position={movedBlockPos} enabled={particleBlockId !== null} duration={0.6} />
      )}

      {/* Tower blocks — первые кадры загружаем батчами по 9 для снижения spike */}
      {visibleBlocks.map((b) => (
        <Block key={b.id} id={b.id} position={b.position} rotation={b.rotation} color={b.color}
          onClick={onBlockClick} isSelected={b.id === selectedId}
          isGhost={b.id === selectedId && dropSlots && dropSlots.length > 0}
          onRigidRef={(id, ref) => { rigidRefs.current[id] = ref; }}
          isDynamic={effectiveDynamicIds != null && effectiveDynamicIds.has(b.id)}
          theme={blockTheme}
          isKeyboardFocused={b.id === keyboardFocusId}
          lowPowerMode={lowPowerMode} />
      ))}

      {/* Drop slots: clickable placement zones on top of tower */}
      {dropSlots && dropSlots.map((slot) => (
        <DropSlot
          key={`drop-${slot.slotIndex}`}
          position={slot.position}
          rotation={slot.rotation}
          slotIndex={slot.slotIndex}
          onClick={() => onDropSlot(slot)}
        />
      ))}
    </>
  );
}

export default function GameSceneWithPhysics({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, restartKey, dropSlots, onDropSlot, lastMovedBlockId, lastExtractionPosition, blockTheme, envTheme, keyboardFocusId, onReady, lowPowerMode = false, maxDynamicBlocks = null }) {
  const readyCalled = useRef(false);
  useEffect(() => {
    if (!readyCalled.current && onReady) {
      readyCalled.current = true;
      onReady();
    }
  }, [onReady]);

  // Получаем настройки физики для мобильных устройств
  const physicsSettings = useMemo(() => {
    if (lowPowerMode) {
      return getPhysicsSettingsForMobile();
    }
    return {
      timeStep: 1 / 60,
      velocityThreshold: 0.06,
      maxIterations: 12,
      useCollisionFiltering: false,
    };
  }, [lowPowerMode]);

  // Используем переданный maxDynamicBlocks или значение по умолчанию
  const effectiveMaxDynamicBlocks = maxDynamicBlocks ?? getDynamicBlockLimit();
  return (
      <Suspense fallback={null}>
        <Physics key={restartKey} gravity={[0, -9.81, 0]} debug={false} timeStep={physicsSettings.timeStep}>
          <Scene
            blocks={blocks}
            selectedId={selectedId}
            onBlockClick={onBlockClick}
            simulatingBlockIds={simulatingBlockIds}
            onSimulationComplete={onSimulationComplete}
            dropSlots={dropSlots}
            onDropSlot={onDropSlot}
            lastMovedBlockId={lastMovedBlockId}
            lastExtractionPosition={lastExtractionPosition}
            blockTheme={blockTheme}
            envTheme={envTheme}
            keyboardFocusId={keyboardFocusId}
            lowPowerMode={lowPowerMode}
            maxDynamicBlocks={effectiveMaxDynamicBlocks}
          />
        </Physics>
      </Suspense>
    );
}
