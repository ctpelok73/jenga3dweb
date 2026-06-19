import React, { useRef, useMemo, useState, useEffect, useCallback, memo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';

import * as THREE from 'three';
import {
  BLOCK_W,
  BLOCK_H,
  BLOCK_D,
  LAYER_GAP,
  STEP,
  WOOD_COLORS
} from './towerConfig';
import { BlockBody, FixedBody } from './physics';
import ParticleEffect from './ParticleEffect';
import { getBlockMaterialProps, getEnvironmentTheme } from './blockTextures';
import { physicsOptimizer } from './physicsOptimizer';
import { getPhysicsSettingsForMobile, getDynamicBlockLimit } from './mobileOptimizations';
import { profiler } from './performanceProfiler';

// ─── Shared geometries ───
const sharedBlockGeometry = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D);
const sharedEdgesGeometry = new THREE.EdgesGeometry(sharedBlockGeometry);

// ─── Reusable math objects (avoid per-frame allocations) ───
const _q = new THREE.Quaternion();
const _euler = new THREE.Euler();

// ─── Edges component with theme-aware color ───
function Edges({ edgeColor = '#3a2010' }) {
  const edgeMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: edgeColor }), [edgeColor]);

  useEffect(() => {
    return () => {
      edgeMaterial.dispose();
    };
  }, [edgeMaterial]);

  return (
    <lineSegments geometry={sharedEdgesGeometry} material={edgeMaterial} raycast={() => null} />
  );
}

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
  theme,
  isKeyboardFocused = false,
  lowPowerMode = false,
}) {
  const rigidRef = useRef(null);
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (onRigidRef && rigidRef.current) onRigidRef(id, rigidRef.current);
  }, [id, onRigidRef]);

  useEffect(() => {
    const body = rigidRef.current;
    if (!body) return;
    body.setBodyType(isDynamic ? 0 : 1, true);
    body.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
    _q.setFromEuler(_euler.set(rotation[0], rotation[1], rotation[2]));
    body.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }, [position, rotation, isDynamic]);

  const opacity = isGhost ? 0.35 : 1;

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

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;

    if (lowPowerMode) {
      mat.map = null;
      mat.normalMap = null;
      mat.roughnessMap = null;
    } else {
      mat.map = materialProps.map || null;
      mat.normalMap = materialProps.normalMap || null;
      mat.roughnessMap = materialProps.roughnessMap || null;
    }

    mat.color.set(lowPowerMode ? color : '#ffffff');
    mat.roughness = materialProps.roughness;
    mat.metalness = materialProps.metalness;
    mat.transparent = isGhost;
    mat.opacity = opacity;

    const emissiveColor = isSelected
      ? '#4488ff'
      : isKeyboardFocused
        ? '#ffcc00'
        : isHovered
          ? '#88ccff'
          : materialProps.emissiveDefault || '#000000';

    const emissiveIntensity = isSelected
      ? 0.3
      : isKeyboardFocused
        ? 0.25
        : isHovered
          ? 0.15
          : materialProps.emissiveIntensityDefault || 0;

    mat.emissive.set(emissiveColor);
    mat.emissiveIntensity = emissiveIntensity;
    mat.needsUpdate = true;
  }, [color, materialProps, isGhost, opacity, isSelected, isKeyboardFocused, isHovered, lowPowerMode]);

  useEffect(() => {
    return () => {
      if (materialRef.current) {
        materialRef.current.dispose();
        materialRef.current = null;
      }
    };
  }, []);

  const edgeColor = useMemo(() => {
    const map = {
      neon: color,
      marble: '#8a7a6a',
      ice: '#88c8e8',
      bamboo: '#5d962d',
      candy: color,
    };
    return map[theme] || '#3a2010';
  }, [theme, color]);

  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();
    if (!isDynamic && !isGhost) {
      onClick(id);
    }
  }, [id, onClick, isDynamic, isGhost]);

  const handlePointerOver = useCallback((event) => {
    event.stopPropagation();
    setIsHovered(true);
  }, []);

  const handlePointerOut = useCallback((event) => {
    event.stopPropagation();
    setIsHovered(false);
  }, []);

  return (
    <BlockBody position={position} rotation={rotation} type={isDynamic ? 'dynamic' : 'fixed'} ref={rigidRef} userData={{ id }}>
      <mesh
        ref={meshRef}
        geometry={sharedBlockGeometry}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial ref={materialRef} />
        {(!lowPowerMode || isSelected || isKeyboardFocused) && <Edges edgeColor={edgeColor} />}
      </mesh>
    </BlockBody>
  );
});

// ─── Drop slot: clickable placement zone on top of tower ───
const DropSlot = memo(function DropSlot({ position, rotation, slotIndex, onClick }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef(null);
  const slotMaterialRef = useRef(null);

  if (!slotMaterialRef.current) {
    slotMaterialRef.current = new THREE.MeshStandardMaterial({
      color: '#2a6eff',
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.3,
      emissive: '#2a6eff',
      emissiveIntensity: 0.15,
    });
  }

  useFrame((state) => {
    if (groupRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.03;
      groupRef.current.position.y = position[1] + pulse;
    }
  });

  useEffect(() => {
    const mat = slotMaterialRef.current;
    if (!mat) return;

    const isActive = hovered;

    mat.color.set(isActive ? '#44ff88' : '#2a6eff');
    mat.opacity = isActive ? 0.7 : 0.3;
    mat.emissive.set(isActive ? '#44ff88' : '#2a6eff');
    mat.emissiveIntensity = isActive ? 0.6 : 0.15;
    mat.needsUpdate = true;
  }, [hovered]);

  useEffect(() => {
    return () => {
      if (slotMaterialRef.current) {
        slotMaterialRef.current.dispose();
        slotMaterialRef.current = null;
      }
    };
  }, []);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh
        geometry={sharedBlockGeometry}
        material={slotMaterialRef.current}
        onClick={(event) => {
          event.stopPropagation();
          onClick(slotIndex);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
      />
      <lineSegments geometry={sharedEdgesGeometry} material={slotMaterialRef.current} raycast={() => null} />
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

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

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

  useEffect(() => {
    return () => {
      if (groundTexture) {
        groundTexture.dispose();
      }
    };
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
  const glowColor = envTheme === 'space' ? '#2244aa' : envTheme === 'library' ? '#ff9944' : '#ffcc77';

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
    <FixedBody position={[0, -0.05, 0]} args={[halfSize, 0.05, halfSize]} />
  );
}

function FloorCollider() {
  return (
    <FixedBody position={[0, -5, 0]} args={[10, 0.1, 10]} />
  );
}

// ─── Stars for space theme ───
function SpaceStars({ lowPowerMode = false }) {
  const starsRef = useRef(null);
  const positions = useMemo(() => {
    const arr = [];
    const count = lowPowerMode ? 60 : 200;
    for (let i = 0; i < count; i++) {
      arr.push(
        (Math.random() - 0.5) * 30,
        Math.random() * 15 + 2,
        (Math.random() - 0.5) * 30,
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
function Scene({
  blocks,
  selectedId,
  onBlockClick,
  simulatingBlockIds,
  onSimulationComplete,
  dropSlots,
  onDropSlot,
  lastMovedBlockId,
  lastExtractionPosition,
  blockTheme,
  envTheme,
  keyboardFocusId,
  lowPowerMode = false,
  maxDynamicBlocks = 10,
}) {
  const rigidRefs = useRef({});
  const simulateTime = useRef(0);
  const completionCalled = useRef(false);
  const [particleBlockId, setParticleBlockId] = useState(null);

  const [visibleCount, setVisibleCount] = useState(9);
  const visibleCountRef = useRef(9);
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

  const cascadeDynamicIdsRef = useRef(null);
  const [cascadeDynamicIds, setCascadeDynamicIds] = useState(null);
  const cascadeBlocksRef = useRef(null);
  const cascadeDelayRef = useRef(0);
  const cascadeWaiting = useRef(false);

  const env = useMemo(() => getEnvironmentTheme(envTheme), [envTheme]);

  const onSimulationCompleteRef = useRef(onSimulationComplete);
  onSimulationCompleteRef.current = onSimulationComplete;
  const lastMovedBlockIdRef = useRef(lastMovedBlockId);
  lastMovedBlockIdRef.current = lastMovedBlockId;

  useEffect(() => {
    if (lastMovedBlockId) {
      setParticleBlockId(lastMovedBlockId);
      const timer = setTimeout(() => setParticleBlockId(null), 600);
      return () => clearTimeout(timer);
    }
  }, [lastMovedBlockId]);

  const movedBlockPos = useMemo(() => {
    if (!particleBlockId) return null;
    return lastExtractionPosition;
  }, [particleBlockId, lastExtractionPosition]);

  const effectiveDynamicIds = useMemo(() => {
    if (!simulatingBlockIds && !cascadeDynamicIds) return null;
    const merged = new Set();
    if (simulatingBlockIds) {
      for (const id of simulatingBlockIds) merged.add(id);
    }
    if (cascadeDynamicIds) {
      for (const id of cascadeDynamicIds) merged.add(id);
    }
    return merged.size > 0 ? merged : null;
  }, [simulatingBlockIds, cascadeDynamicIds]);

  const storeRigidRef = useCallback((id, ref) => {
    rigidRefs.current[id] = ref;
  }, []);

  const findNextUnsupportedLayer = useCallback((currentBlocks, alreadyDynamicIds) => {
    const layerBlockCounts = {};
    const layerBlocks = {};
    let maxLayer = 0;

    for (const b of currentBlocks) {
      if (b.layer > maxLayer) maxLayer = b.layer;
      if (!layerBlocks[b.layer]) layerBlocks[b.layer] = [];
      layerBlocks[b.layer].push(b);

      if (!alreadyDynamicIds.has(b.id) && b.position[1] > -0.5) {
        layerBlockCounts[b.layer] = (layerBlockCounts[b.layer] || 0) + 1;
      }
    }

    const dynamicLayers = new Set();
    for (const b of currentBlocks) {
      if (alreadyDynamicIds.has(b.id)) {
        dynamicLayers.add(b.layer);
      }
    }

    for (const dynLayer of dynamicLayers) {
      const layerAbove = dynLayer + 1;
      if (layerAbove > maxLayer) continue;
      if (!layerBlocks[layerAbove]) continue;

      const aboveAlreadyDynamic = layerBlocks[layerAbove].every((b) => alreadyDynamicIds.has(b.id));
      if (aboveAlreadyDynamic) continue;

      const fixedInSupport = layerBlockCounts[dynLayer] || 0;

      let supportLayerCollapsed = false;
      if (fixedInSupport === 0) {
        const dynBlocksInLayer = layerBlocks[dynLayer].filter((b) => alreadyDynamicIds.has(b.id));
        let allFallen = true;
        for (const b of dynBlocksInLayer) {
          const rigid = rigidRefs.current[b.id];
          if (rigid) {
            const trans = rigid.translation();
            const originalY = b.layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
            if (trans.y > originalY - 0.2) {
              allFallen = false;
              break;
            }
          }
        }
        if (allFallen || dynBlocksInLayer.length === 0) {
          supportLayerCollapsed = true;
        }
      }

      if (supportLayerCollapsed) {
        return layerAbove;
      }
    }

    return null;
  }, []);

  useFrame((state, delta) => {
    profiler.mark('frame_start');

    const activeIds = effectiveDynamicIds;
    if (!activeIds || activeIds.size === 0 || completionCalled.current) return;

    profiler.mark('physics_start');
    physicsOptimizer.updateSimulationState(true, activeIds.size);
    const cam = state.camera.position;
    physicsOptimizer.updateCameraPosition([cam.x, cam.y, cam.z]);

    const frameParams = physicsOptimizer.getFrameParams(activeIds.size);
    if (!frameParams.shouldUpdatePhysics) {
      profiler.measure('frame_total', 'frame_start', 'total');
      return;
    }

    if (cascadeWaiting.current) {
      cascadeDelayRef.current += delta * 1000;
      if (cascadeDelayRef.current < 150) {
        profiler.measure('frame_total', 'frame_start', 'total');
        return;
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
    const VT2 = VT * VT;

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

    const maxTimeout = Math.min(frameParams.timeout, 5000);
    if (allSettled || simulateTime.current >= maxTimeout) {
      profiler.mark('snapshot_start');
      const workingBlocks = (cascadeBlocksRef.current || blocks).map((b) => {
        if (activeIds.has(b.id)) {
          const rigid = rigidRefs.current[b.id];
          if (rigid) {
            const trans = rigid.translation();
            const rot = rigid.rotation();
            _q.set(rot.x, rot.y, rot.z, rot.w);
            _euler.setFromQuaternion(_q);
            return {
              ...b,
              position: [trans.x, trans.y, trans.z],
              rotation: [_euler.x, _euler.y, _euler.z],
            };
          }
        }
        return b;
      });
      profiler.measure('snapshot', 'snapshot_start', 'logic');

      profiler.mark('cascade_check_start');
      const nextResult = findNextUnsupportedLayer(workingBlocks, activeIds);
      profiler.measure('cascade_check', 'cascade_check_start', 'logic');

      const currentLastMoved = lastMovedBlockIdRef.current;

      if (nextResult !== null) {
        const newDynamicIds = new Set(activeIds);
        if (Array.isArray(nextResult)) {
          for (const id of nextResult) {
            if (id !== currentLastMoved) newDynamicIds.add(id);
          }
        } else {
          const nextLayer = nextResult;
          for (const b of workingBlocks) {
            if (b.layer === nextLayer && b.id !== currentLastMoved) {
              newDynamicIds.add(b.id);
            }
          }
        }
        cascadeBlocksRef.current = workingBlocks;
        cascadeDynamicIdsRef.current = newDynamicIds;
        setCascadeDynamicIds(newDynamicIds);
        simulateTime.current = 0;
        cascadeWaiting.current = true;
        cascadeDelayRef.current = 0;
      } else {
        completionCalled.current = true;
        simulateTime.current = 0;
        cascadeBlocksRef.current = null;
        cascadeDynamicIdsRef.current = null;
        setCascadeDynamicIds(null);
        physicsOptimizer.updateSimulationState(false);

        for (const id of activeIds) {
          const rigid = rigidRefs.current[id];
          if (rigid) {
            rigid.setBodyType(1, true);
          }
        }
        onSimulationCompleteRef.current(workingBlocks);
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
      <fog attach="fog" args={[env.fogColor, env.fogNear, env.fogFar]} />

      {!lowPowerMode && (
        <pointLight
          position={[0, 0.5, 0]}
          intensity={0.3}
          color={
            envTheme === 'space'
              ? '#4466cc'
              : envTheme === 'library'
                ? '#ff9944'
                : '#ffddaa'
          }
          distance={5}
          decay={2}
        />
      )}

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

      {envTheme === 'space' && <SpaceStars lowPowerMode={lowPowerMode} />}

      <GroundSurface envTheme={envTheme} />
      <GroundCollider envTheme={envTheme} />

      {!lowPowerMode && (
        <group>
          <mesh position={[0, -0.06, 0]} receiveShadow castShadow raycast={() => null}>
            <cylinderGeometry args={[2.2, 2.4, 0.08, 32]} />
            <meshStandardMaterial
              color={{ space: '#1a1a2e', beach: '#b8956a' }[envTheme] || '#5a3a1a'}
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
          <mesh position={[0, -1.5, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.4, 0.6, 2.8, 16]} />
            <meshStandardMaterial
              color={{ space: '#121228', beach: '#a07848' }[envTheme] || '#3a2210'}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, -2.95, 0]} raycast={() => null}>
            <cylinderGeometry args={[1.2, 1.3, 0.1, 24]} />
            <meshStandardMaterial
              color={{ space: '#151530', beach: '#a07848' }[envTheme] || '#4a2a14'}
              roughness={0.75}
            />
          </mesh>
        </group>
      )}

      <FloorCollider />

      {!lowPowerMode && movedBlockPos && (
        <ParticleEffect position={movedBlockPos} enabled={particleBlockId !== null} duration={0.6} />
      )}

      {visibleBlocks.map((b) => (
        <Block
          key={b.id}
          id={b.id}
          position={b.position}
          rotation={b.rotation}
          color={b.color}
          onClick={onBlockClick}
          isSelected={b.id === selectedId}
          isGhost={b.id === selectedId && dropSlots && dropSlots.length > 0}
          onRigidRef={storeRigidRef}
          isDynamic={effectiveDynamicIds != null && effectiveDynamicIds.has(b.id)}
          theme={blockTheme}
          isKeyboardFocused={b.id === keyboardFocusId}
          lowPowerMode={lowPowerMode}
        />
      ))}

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

export default function GameSceneWithPhysics({
  blocks,
  selectedId,
  onBlockClick,
  simulatingBlockIds,
  onSimulationComplete,
  restartKey,
  dropSlots,
  onDropSlot,
  lastMovedBlockId,
  lastExtractionPosition,
  blockTheme,
  envTheme,
  keyboardFocusId,
  onReady,
  lowPowerMode = false,
  maxDynamicBlocks = null,
}) {
  const readyCalled = useRef(false);

  useEffect(() => {
    if (!readyCalled.current && onReady) {
      readyCalled.current = true;
      onReady();
    }
  }, [onReady]);

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

  const effectiveMaxDynamicBlocks = maxDynamicBlocks ?? getDynamicBlockLimit();

  return (
    <Suspense fallback={null}>
      <Physics
        key={restartKey}
        gravity={[0, -9.81, 0]}
        debug={false}
        timeStep={physicsSettings.timeStep}
      >
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
