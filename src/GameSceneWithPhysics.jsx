import React, { useRef, useMemo, useState, useEffect } from 'react';
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

// ─── Shared geometries (one instance for all 54 blocks) ───
const sharedBlockGeometry = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D);
const sharedEdgesGeometry = new THREE.EdgesGeometry(sharedBlockGeometry);
const sharedEdgesMaterial = new THREE.LineBasicMaterial({ color: '#3a2010' });

function Edges() {
  return (
    <lineSegments geometry={sharedEdgesGeometry} material={sharedEdgesMaterial} raycast={() => null} />
  );
}

function Block({
  id,
  position,
  rotation,
  color,
  onClick,
  isSelected,
  onRigidRef,
  isDynamic = false
}) {
  const rigidRef = useRef(null);
  const meshRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (onRigidRef && rigidRef.current) onRigidRef(id, rigidRef.current);
  }, [id, onRigidRef]);

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
        onClick={(e) => {
          e.stopPropagation();
          if (!isDynamic) {
            onClick(id);
          }
        }}
        onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.75}
          metalness={0.0}
          emissive={isSelected ? '#4488ff' : (isHovered ? '#88ccff' : '#000000')}
          emissiveIntensity={isSelected ? 0.3 : (isHovered ? 0.15 : 0)}
        />
        <Edges />
      </mesh>
    </RigidBody>
  );
}

// ─── Simplified scene: just a flat wooden surface ───
function GroundSurface() {
  return (
    <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}>
      <planeGeometry args={[4, 4]} />
      <meshStandardMaterial color="#6b4226" roughness={0.8} />
    </mesh>
  );
}

// ─── Ground collider: flat surface at y=0 for blocks to rest on ───
function GroundCollider() {
  return (
    <RigidBody type="fixed" position={[0, -0.05, 0]}>
      <CuboidCollider args={[2, 0.05, 2]} />
    </RigidBody>
  );
}

// ─── Floor collider far below: catches fallen blocks ───
function FloorCollider() {
  return (
    <RigidBody type="fixed" position={[0, -5, 0]}>
      <CuboidCollider args={[10, 0.1, 10]} />
    </RigidBody>
  );
}

function Scene({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete }) {
  const rigidRefs = useRef({});
  const simulateTime = useRef(0);
  const completionCalled = useRef(false);

  // ─── Settling detection by velocity, not timer ───
  useFrame((_, delta) => {
    if (simulatingBlockIds && simulatingBlockIds.size > 0 && !completionCalled.current) {
      simulateTime.current += delta * 1000;

      // Minimum 300ms before checking settling
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

        // Convert quaternion → Euler for consistent rotation format
        const updatedBlocks = blocks.map(b => {
          if (simulatingBlockIds.has(b.id)) {
            const rigid = rigidRefs.current[b.id];
            if (rigid) {
              const trans = rigid.translation();
              const q = rigid.rotation();
              const quaternion = new THREE.Quaternion(q.x, q.y, q.z, q.w);
              const euler = new THREE.Euler().setFromQuaternion(quaternion);
              return {
                ...b,
                position: [trans.x, trans.y, trans.z],
                rotation: [euler.x, euler.y, euler.z]
              };
            }
          }
          return b;
        });

        onSimulationComplete(updatedBlocks);
      }
    }
  });

  // Reset timers when a new simulation phase starts
  useEffect(() => {
    if (simulatingBlockIds && simulatingBlockIds.size > 0) {
      simulateTime.current = 0;
      completionCalled.current = false;
    }
  }, [simulatingBlockIds]);

  return (
    <>
      {/* Clean lighting: warm overhead + soft ambient */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#e8d5b0', '#2a1a0a', 0.5]} />
      <directionalLight position={[2, 8, 4]} intensity={0.8} color="#ffddaa" />
      <directionalLight position={[-2, 6, -3]} intensity={0.3} color="#ffcc88" />

      <GroundSurface />
      <GroundCollider />
      <FloorCollider />

      {/* Only blocks in simulatingBlockIds become dynamic */}
      {blocks.map((b) => (
        <Block key={b.id} id={b.id} position={b.position} rotation={b.rotation} color={b.color}
          onClick={onBlockClick} isSelected={b.id === selectedId}
          onRigidRef={(id, ref) => { rigidRefs.current[id] = ref; }}
          isDynamic={simulatingBlockIds != null && simulatingBlockIds.has(b.id)} />
      ))}
    </>
  );
}

// restartKey forces Physics remount → clears stale rigidRefs
export default function GameSceneWithPhysics({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, restartKey }) {
  return (
    <Physics key={restartKey} gravity={[0, -9.81, 0]} debug={false}>
      <Scene
        blocks={blocks}
        selectedId={selectedId}
        onBlockClick={onBlockClick}
        simulatingBlockIds={simulatingBlockIds}
        onSimulationComplete={onSimulationComplete}
      />
    </Physics>
  );
}
