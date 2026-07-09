/**
 * InstancedBlocks.jsx — Renders static blocks as a single InstancedMesh
 *
 * Batches all non-interactive blocks into ONE draw call instead of N.
 * Also merges all edge geometries into ONE lineSegments draw call.
 * Saves ~52 draw calls for a full tower.
 *
 * Interactive blocks (selected, dynamic, hovered, focused) are rendered
 * individually by the parent so they can have per-instance effects.
 */

import React, { useRef, useMemo, useEffect, useCallback, memo } from 'react';
import * as THREE from 'three';
import { BLOCK_W, BLOCK_H, BLOCK_D } from '../towerConfig';
import { getBlockMaterialProps } from '../blockTextures';

const sharedBlockGeometry = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D);
const sharedEdgesGeometry = new THREE.EdgesGeometry(sharedBlockGeometry);

// Reusable math objects — avoid per-frame/per-block allocations
const _matrix = new THREE.Matrix4();
const _color = new THREE.Color();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3(1, 1, 1);

/**
 * Per-block edge color lookup based on blockTheme.
 * For neon/candy themes edges match the block's color;
 * for others it's a static theme color.
 */
export function getBlockEdgeColor(b, blockTheme) {
  switch (blockTheme) {
    case 'neon':  return b.color;
    case 'candy': return b.color;
    case 'marble': return '#8a7a6a';
    case 'ice':   return '#88c8e8';
    case 'bamboo': return '#5d962d';
    default:      return '#3a2010';
  }
}

/**
 * Merge all block edges into a single BufferGeometry with per-vertex colors.
 * This avoids creating N × lineSegments draw calls.
 */
export function mergeEdgeGeometries(blocks, blockTheme = 'classic') {
  const positions = [];
  const colors = [];
  const tmpPos = sharedEdgesGeometry.attributes.position;
  const count = tmpPos.count;
  const vec = new THREE.Vector3();
  const tmpColor = new THREE.Color();

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    _euler.set(b.rotation[0], b.rotation[1], b.rotation[2]);
    _quat.setFromEuler(_euler);
    _pos.set(b.position[0], b.position[1], b.position[2]);
    _matrix.compose(_pos, _quat, _scale);

    const edgeColor = getBlockEdgeColor(b, blockTheme);
    tmpColor.set(edgeColor);

    for (let v = 0; v < count; v++) {
      vec.set(tmpPos.getX(v), tmpPos.getY(v), tmpPos.getZ(v));
      vec.applyMatrix4(_matrix);
      positions.push(vec.x, vec.y, vec.z);
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

const InstancedBlocks = memo(function InstancedBlocks({
  blocks,
  blockTheme,
  lowPowerMode = false,
  onBlockClick,
  onBlockHover,
  onBlockUnhover,
}) {
  const meshRef = useRef(null);
  const edgesRef = useRef(null);
  const materialRef = useRef(null);
  const edgeMaterialRef = useRef(null);
  const cleanupRef = useRef(null);

  const count = blocks.length;

  // Build a lookup array for instanceId → blockId
  // Stored in a ref so pointer handlers always have the latest mapping
  const blockIdLookup = useMemo(() => blocks.map((b) => b.id), [blocks]);

  // ─── Merged edges geometry with per-block theme colors ───
  const mergedEdgesGeo = useMemo(() => {
    if (blocks.length === 0 || lowPowerMode) return null;
    const geo = mergeEdgeGeometries(blocks, blockTheme);
    return geo;
  }, [blocks, blockTheme, lowPowerMode]);

  // Cleanup merged edges geometry on unmount
  useEffect(() => {
    return () => {
      if (mergedEdgesGeo) mergedEdgesGeo.dispose();
    };
  }, [mergedEdgesGeo]);

  // ─── Shared material props ───
  const materialProps = useMemo(() => {
    if (lowPowerMode) {
      return { roughness: 0.72, metalness: 0 };
    }
    // Use the theme's material props — vertexColors handles per-block color
    return getBlockMaterialProps(blockTheme, '#ffffff');
  }, [blockTheme, lowPowerMode]);

  // ─── Sync instance matrices & colors ───
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    // Guard: outside a real WebGL/R3F canvas (e.g. jsdom) the ref is a
    // plain element without InstancedMesh methods — skip sync harmlessly.
    if (typeof mesh.setMatrixAt !== 'function') return;

    mesh.count = count;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      _pos.set(b.position[0], b.position[1], b.position[2]);
      _euler.set(b.rotation[0], b.rotation[1], b.rotation[2]);
      _quat.setFromEuler(_euler);
      _matrix.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _matrix);
      _color.set(b.color);
      mesh.setColorAt(i, _color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();

    // Sync edges instancedMesh if we used it (we use merged geometry instead)
    // Not needed — edges are merged into a single geometry above.
  }, [blocks, count]);

  // ─── Sync material (theme textures, lowPowerMode) ───
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat || typeof mat.color?.set !== 'function') return;

    if (lowPowerMode) {
      mat.map = null;
      mat.normalMap = null;
      mat.roughnessMap = null;
      mat.color.set('#ffffff');
    } else {
      mat.map = materialProps.map || null;
      mat.normalMap = materialProps.normalMap || null;
      mat.roughnessMap = materialProps.roughnessMap || null;
      mat.roughness = materialProps.roughness ?? 0.72;
      mat.metalness = materialProps.metalness ?? 0;
    }

    mat.vertexColors = true;
    mat.needsUpdate = true;
  }, [materialProps, lowPowerMode]);

  // ─── Edge material: use vertexColors (per-block) from merged geometry ───
  useEffect(() => {
    if (edgeMaterialRef.current && typeof edgeMaterialRef.current.color?.set === 'function') {
      edgeMaterialRef.current.vertexColors = true;
      edgeMaterialRef.current.color.set('#ffffff');
    }
  }, []);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      if (materialRef.current) {
        materialRef.current.dispose();
        materialRef.current = null;
      }
      if (edgeMaterialRef.current) {
        edgeMaterialRef.current.dispose();
        edgeMaterialRef.current = null;
      }
    };
  }, []);

  // ─── Pointer events via instanceId ───
  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();
    if (event.instanceId !== undefined && blockIdLookup[event.instanceId] !== undefined) {
      onBlockClick(blockIdLookup[event.instanceId]);
    }
  }, [blockIdLookup, onBlockClick]);

  const handlePointerOver = useCallback((event) => {
    event.stopPropagation();
    if (event.instanceId !== undefined && blockIdLookup[event.instanceId] !== undefined) {
      onBlockHover(blockIdLookup[event.instanceId]);
    }
  }, [blockIdLookup, onBlockHover]);

  const handlePointerOut = useCallback((event) => {
    event.stopPropagation();
    onBlockUnhover();
  }, [onBlockUnhover]);

  if (count === 0) return null;

  return (
    <group>
      {/* Single draw call for ALL static block surfaces */}
      <instancedMesh
        ref={meshRef}
        args={[sharedBlockGeometry, null, count]}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        frustumCulled={false}
      >
        <meshStandardMaterial ref={materialRef} />
      </instancedMesh>

      {/* Single draw call for ALL static block outlines (except low-power) */}
      {mergedEdgesGeo && (
        <lineSegments
          ref={edgesRef}
          geometry={mergedEdgesGeo}
          raycast={() => null}
        >
          <lineBasicMaterial ref={edgeMaterialRef} />
        </lineSegments>
      )}
    </group>
  );
});

export default InstancedBlocks;
