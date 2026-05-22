import React, { useRef, useMemo, useState, useEffect, useCallback, memo } from 'react';
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
}) {
  const rigidRef = useRef(null);
  const meshRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (onRigidRef && rigidRef.current) onRigidRef(id, rigidRef.current);
  }, [id, onRigidRef]);

  // ─── Handle dynamic type transitions (for cascading layer-by-layer gravity) ───
  useEffect(() => {
    const body = rigidRef.current;
    if (!body) return;
    if (isDynamic) {
      // Transition to dynamic: set body type and wake it up so gravity takes effect
      body.setBodyType(0, true); // 0 = Dynamic, true = wake
    } else {
      body.setBodyType(1, true); // 1 = Fixed
    }
  }, [isDynamic]);

  // Ghost block: selected block shown semi-transparent to indicate it's "lifted"
  const opacity = isGhost ? 0.35 : 1;

  // ─── Procedural texture material props ───
  const materialProps = useMemo(() => getBlockMaterialProps(theme, color), [theme, color]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (!isDynamic && !isGhost) {
      onClick(id);
    }
  };

  // Edge color depends on theme
  const edgeColor = theme === 'neon' ? color : (theme === 'marble' ? '#8a7a6a' : (theme === 'ice' ? '#88c8e8' : (theme === 'bamboo' ? '#5d962d' : (theme === 'candy' ? color : '#3a2010'))));

  // Emissive logic — keyboard focus shows as yellow outline, different from blue select
  const emissiveColor = isSelected ? '#4488ff' : (isKeyboardFocused ? '#ffcc00' : (isHovered ? '#88ccff' : materialProps.emissiveDefault));
  const emissiveIntensity = isSelected ? 0.3 : (isKeyboardFocused ? 0.25 : (isHovered ? 0.15 : (materialProps.emissiveIntensityDefault || 0)));

  return (
    <RigidBody
      ref={rigidRef}
      type={isDynamic ? "dynamic" : "fixed"}
      position={position}
      rotation={rotation}
      colliders={false}
      mass={BLOCK_PHYSICS.mass}
      restitution={BLOCK_PHYSICS.restitution}
      friction={BLOCK_PHYSICS.friction}
      linearDamping={BLOCK_PHYSICS.linearDamping}
      angularDamping={BLOCK_PHYSICS.angularDamping}
      userData={{ id }}
    >
      <CuboidCollider args={[BLOCK_W / 2, BLOCK_H / 2, BLOCK_D / 2]} />
      <mesh
        ref={meshRef}
        geometry={sharedBlockGeometry}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
      >
        <meshStandardMaterial
          map={materialProps.map}
          normalMap={materialProps.normalMap}
          roughness={materialProps.roughness}
          metalness={materialProps.metalness}
          transparent={isGhost}
          opacity={opacity}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
        <Edges edgeColor={edgeColor} />
      </mesh>
    </RigidBody>
  );
});

// ─── Drop slot: clickable placement zone on top of tower ───
const DropSlot = memo(function DropSlot({ position, rotation, slotIndex, onClick, isDragHover = false }) {
  const [hovered, setHovered] = useState(false);
  const isHighlighted = hovered || isDragHover;

  // Memoize line material to prevent re-creation every render
  const lineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({
      color: isHighlighted ? '#44ff88' : '#2a6eff',
      linewidth: isHighlighted ? 3 : 1,
    }),
    [isHighlighted]
  );

  useEffect(() => {
    return () => { lineMaterial.dispose(); };
  }, [lineMaterial]);
  
  return (
    <group position={position} rotation={rotation}>
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
function GroundSurface({ envTheme }) {
  const theme = getEnvironmentTheme(envTheme);
  return (
    <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}>
      <planeGeometry args={[theme.groundSize, theme.groundSize]} />
      <meshStandardMaterial color={theme.groundColor} roughness={theme.groundRoughness} />
    </mesh>
  );
}

function GroundCollider({ envTheme }) {
  const theme = getEnvironmentTheme(envTheme);
  const halfSize = theme.groundSize / 2;
  return (
    <RigidBody type="fixed" position={[0, -0.05, 0]}>
      <CuboidCollider args={[halfSize, 0.05, halfSize]} />
    </RigidBody>
  );
}

function FloorCollider() {
  return (
    <RigidBody type="fixed" position={[0, -5, 0]}>
      <CuboidCollider args={[10, 0.1, 10]} />
    </RigidBody>
  );
}

// ─── Stars for space theme ───
function SpaceStars() {
  const starsRef = useRef();
  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 200; i++) {
      arr.push(
        (Math.random() - 0.5) * 30,
        Math.random() * 15 + 2,
        (Math.random() - 0.5) * 30
      );
    }
    return new Float32Array(arr);
  }, []);

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
function Scene({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, dropSlots, onDropSlot, lastMovedBlockId, blockTheme, envTheme, keyboardFocusId }) {
  const rigidRefs = useRef({});
  const simulateTime = useRef(0);
  const completionCalled = useRef(false);
  const [particleBlockId, setParticleBlockId] = useState(null);

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
    const block = blocks.find(b => b.id === particleBlockId);
    return block ? block.position : null;
  }, [particleBlockId, blocks]);

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

  // ─── Settling detection with cascade support ───
  useFrame((_, delta) => {
    const activeIds = effectiveDynamicIds;
    if (!activeIds || activeIds.size === 0 || completionCalled.current) return;

    // Handle cascade delay (brief pause between layer activations for visual effect)
    if (cascadeWaiting.current) {
      cascadeDelayRef.current += delta * 1000;
      if (cascadeDelayRef.current < 150) return; // 150ms pause before next layer falls
      cascadeWaiting.current = false;
      cascadeDelayRef.current = 0;
    }

    simulateTime.current += delta * 1000;
    if (simulateTime.current < 300) return;

    let allSettled = true;
    const VELOCITY_THRESHOLD = 0.08;
    for (const id of activeIds) {
      const rigid = rigidRefs.current[id];
      if (rigid) {
        const linVel = rigid.linvel();
        const angVel = rigid.angvel();
        const linSpeed = Math.sqrt(linVel.x ** 2 + linVel.y ** 2 + linVel.z ** 2);
        const angSpeed = Math.sqrt(angVel.x ** 2 + angVel.y ** 2 + angVel.z ** 2);
        if (linSpeed > VELOCITY_THRESHOLD || angSpeed > VELOCITY_THRESHOLD) {
          allSettled = false;
          break;
        }
      }
    }

    if (allSettled || simulateTime.current >= 5000) {
      // Snapshot current positions of dynamic blocks
      const workingBlocks = (cascadeBlocksRef.current || blocks).map(b => {
        if (activeIds.has(b.id)) {
          const rigid = rigidRefs.current[b.id];
          if (rigid) {
            const trans = rigid.translation();
            const q = rigid.rotation();
            const quaternion = new THREE.Quaternion(q.x, q.y, q.z, q.w);
            const euler = new THREE.Euler().setFromQuaternion(quaternion);
            return { ...b, position: [trans.x, trans.y, trans.z], rotation: [euler.x, euler.y, euler.z] };
          }
        }
        return b;
      });

      // Check if there's an unsupported layer above that should cascade
      const nextLayer = findNextUnsupportedLayer(workingBlocks, activeIds);

      if (nextLayer !== null) {
        // ─── CASCADE: activate the next unsupported layer ───
        const newDynamicIds = new Set(activeIds);
        for (const b of workingBlocks) {
          if (b.layer === nextLayer) {
            newDynamicIds.add(b.id);
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
        onSimulationComplete(workingBlocks);
      }
    }
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

  return (
    <>
      {/* ─── Fog ─── */}
      <fog attach="fog" args={[env.fogColor, env.fogNear, env.fogFar]} />

      {/* ─── Lighting ─── */}
      <ambientLight intensity={env.ambientIntensity} />
      <hemisphereLight args={[env.hemiSkyColor, env.hemiGroundColor, env.hemiIntensity]} />
      {env.dirLights.map((dl, i) => (
        <directionalLight
          key={`dir-${i}`}
          position={dl.position}
          intensity={dl.intensity}
          color={dl.color}
          castShadow={env.shadowEnabled}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
      ))}
      {env.spotLight && (
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
      {envTheme === 'space' && <SpaceStars />}

      {/* ─── Ground ─── */}
      <GroundSurface envTheme={envTheme} />
      <GroundCollider envTheme={envTheme} />
      <FloorCollider />

      {/* Particle effect for successful move */}
      {movedBlockPos && (
        <ParticleEffect position={movedBlockPos} enabled={particleBlockId !== null} duration={0.6} />
      )}

      {/* Tower blocks — selected block shown as ghost (semi-transparent) */}
      {blocks.map((b) => (
        <Block key={b.id} id={b.id} position={b.position} rotation={b.rotation} color={b.color}
          onClick={onBlockClick} isSelected={b.id === selectedId}
          isGhost={b.id === selectedId && dropSlots && dropSlots.length > 0}
          onRigidRef={(id, ref) => { rigidRefs.current[id] = ref; }}
          isDynamic={effectiveDynamicIds != null && effectiveDynamicIds.has(b.id)}
          theme={blockTheme}
          isKeyboardFocused={b.id === keyboardFocusId} />
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

export default function GameSceneWithPhysics({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, restartKey, dropSlots, onDropSlot, lastMovedBlockId, blockTheme, envTheme, keyboardFocusId }) {
  return (
    <Physics key={restartKey} gravity={[0, -9.81, 0]} debug={false}>
      <Scene
        blocks={blocks}
        selectedId={selectedId}
        onBlockClick={onBlockClick}
        simulatingBlockIds={simulatingBlockIds}
        onSimulationComplete={onSimulationComplete}
        dropSlots={dropSlots}
        onDropSlot={onDropSlot}
        lastMovedBlockId={lastMovedBlockId}
        blockTheme={blockTheme}
        envTheme={envTheme}
        keyboardFocusId={keyboardFocusId}
      />
    </Physics>
  );
}
