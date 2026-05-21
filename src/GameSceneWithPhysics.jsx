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
import { getBlockMaterialProps, clearTextureCache, getEnvironmentTheme } from './blockTextures';

// ─── Shared geometries ───
const sharedBlockGeometry = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D);
const sharedEdgesGeometry = new THREE.EdgesGeometry(sharedBlockGeometry);

// ─── Edges component with theme-aware color ───
function Edges({ edgeColor = '#3a2010' }) {
  const edgeMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: edgeColor }), [edgeColor]);
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
      <lineSegments geometry={sharedEdgesGeometry} raycast={() => null}>
        <lineBasicMaterial color={isHighlighted ? '#44ff88' : '#2a6eff'} linewidth={isHighlighted ? 3 : 1} />
      </lineSegments>
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

  // ─── Settling detection ───
  useFrame((_, delta) => {
    if (simulatingBlockIds && simulatingBlockIds.size > 0 && !completionCalled.current) {
      simulateTime.current += delta * 1000;
      if (simulateTime.current < 300) return;

      let allSettled = true;
      const VELOCITY_THRESHOLD = 0.08;
      for (const id of simulatingBlockIds) {
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
        completionCalled.current = true;
        simulateTime.current = 0;

        const updatedBlocks = blocks.map(b => {
          if (simulatingBlockIds.has(b.id)) {
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
        onSimulationComplete(updatedBlocks);
      }
    }
  });

  useEffect(() => {
    if (simulatingBlockIds && simulatingBlockIds.size > 0) {
      simulateTime.current = 0;
      completionCalled.current = false;
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
          isDynamic={simulatingBlockIds != null && simulatingBlockIds.has(b.id)}
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
