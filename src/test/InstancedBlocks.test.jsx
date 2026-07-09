/**
 * Unit tests for InstancedBlocks component
 *
 * Pure functions (mergeEdgeGeometries, getBlockEdgeColor) are tested
 * directly — they only need THREE.js which works in jsdom.
 *
 * Component tests check behavior through the real DOM (jsdom). R3F's
 * custom JSX elements like <instancedMesh> render as HTMLUnknownElement
 * in jsdom, which is sufficient for structural and behavioral tests.
 * blockTextures is mocked to avoid Canvas 2D issues.
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { BLOCK_W, BLOCK_H, BLOCK_D } from '../towerConfig';

// ─── Mock blockTextures to avoid Canvas 2D issues in jsdom ─────────────────
vi.mock('../blockTextures', () => ({
  getBlockMaterialProps: vi.fn(() => ({
    roughness: 0.72,
    metalness: 0,
  })),
}));

// ─── SUT imports ───────────────────────────────────────────────────────────
import InstancedBlocks, { mergeEdgeGeometries, getBlockEdgeColor } from '../components/InstancedBlocks';

// ─── Test helpers ──────────────────────────────────────────────────────────
const makeBlock = (id, overrides = {}) => ({
  id,
  position: [0, id * 0.3, 0],
  rotation: [0, 0, 0],
  color: '#cc8844',
  layer: Math.floor(id / 3),
  ...overrides,
});

const sampleBlocks = [
  makeBlock(0, { position: [-0.75, 0.15, 0], color: '#cc8844' }),
  makeBlock(1, { position: [0, 0.15, 0.75], color: '#bb7733' }),
  makeBlock(2, { position: [0.75, 0.15, 0], color: '#aa6622' }),
  makeBlock(3, { position: [0, 0.45, -0.75], color: '#cc8844' }),
];

// ═════════════════════════════════════════════════════════════════════════════
//  Pure function tests — no mocking needed, pure THREE.js math
// ═════════════════════════════════════════════════════════════════════════════

describe('getBlockEdgeColor()', () => {
  it('returns block color for neon theme', () => {
    expect(getBlockEdgeColor({ color: '#ff00ff' }, 'neon')).toBe('#ff00ff');
  });

  it('returns block color for candy theme', () => {
    expect(getBlockEdgeColor({ color: '#00ff88' }, 'candy')).toBe('#00ff88');
  });

  it('returns warm brown for classic theme', () => {
    expect(getBlockEdgeColor({ color: '#ff0000' }, 'classic')).toBe('#3a2010');
  });

  it('returns gray-brown for marble theme', () => {
    expect(getBlockEdgeColor({ color: '#fff' }, 'marble')).toBe('#8a7a6a');
  });

  it('returns light blue for ice theme', () => {
    expect(getBlockEdgeColor({ color: '#fff' }, 'ice')).toBe('#88c8e8');
  });

  it('returns green for bamboo theme', () => {
    expect(getBlockEdgeColor({ color: '#fff' }, 'bamboo')).toBe('#5d962d');
  });

  it('returns fallback for unknown theme', () => {
    expect(getBlockEdgeColor({ color: '#fff' }, 'future')).toBe('#3a2010');
    expect(getBlockEdgeColor({ color: '#fff' }, undefined)).toBe('#3a2010');
  });
});

describe('mergeEdgeGeometries()', () => {
  let vertsPerBlock;

  beforeAll(() => {
    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D));
    vertsPerBlock = edgesGeo.attributes.position.count;
  });

  it('returns a BufferGeometry with position and color attributes', () => {
    const geo = mergeEdgeGeometries(sampleBlocks, 'classic');
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
    expect(geo.attributes.position).toBeTruthy();
    expect(geo.attributes.color).toBeTruthy();
    expect(geo.attributes.position.count).toBeGreaterThan(0);
  });

  it('position and color attributes have same length', () => {
    const geo = mergeEdgeGeometries(sampleBlocks, 'classic');
    expect(geo.attributes.color.count).toBe(geo.attributes.position.count);
  });

  it('produces correct vertex count = N blocks × vertices-per-edges', () => {
    const geo = mergeEdgeGeometries(sampleBlocks, 'classic');
    expect(geo.attributes.position.count).toBe(sampleBlocks.length * vertsPerBlock);
  });

  it('applies per-block edge colors for neon theme', () => {
    const rainbowBlocks = [
      makeBlock(0, { color: '#ff0000' }),
      makeBlock(1, { color: '#00ff00' }),
      makeBlock(2, { color: '#0000ff' }),
    ];

    const geo = mergeEdgeGeometries(rainbowBlocks, 'neon');
    const colors = geo.attributes.color;

    // Block 0 → red
    expect(colors.getX(0)).toBeCloseTo(1, 1);
    expect(colors.getY(0)).toBeCloseTo(0, 1);

    // Block 1 → green (first vertex of second block)
    const idx1 = vertsPerBlock;
    expect(colors.getX(idx1)).toBeCloseTo(0, 1);
    expect(colors.getY(idx1)).toBeCloseTo(1, 1);

    // Block 2 → blue (first vertex of third block)
    const idx2 = vertsPerBlock * 2;
    expect(colors.getX(idx2)).toBeCloseTo(0, 1);
    expect(colors.getY(idx2)).toBeCloseTo(0, 1);
    expect(colors.getZ(idx2)).toBeCloseTo(1, 1);
  });

  it('uses theme-based static colors when not neon/candy', () => {
    const blocks = [makeBlock(0, { color: '#ff0000' })];
    const classic = mergeEdgeGeometries(blocks, 'classic');
    const ice = mergeEdgeGeometries(blocks, 'ice');
    const marble = mergeEdgeGeometries(blocks, 'marble');

    // All themes must differ from the block's own color (#ff0000 → red, r≈1).
    // three.js color management stores these as LINEAR values, so we assert on
    // channel ordering / magnitude rather than exact sRGB floats.
    const classicColor = classic.attributes.color;
    const iceColor = ice.attributes.color;
    const marbleColor = marble.attributes.color;

    // Edge colors are dark/neutral, so red channel must be far below the block's ~1.0
    expect(classicColor.getX(0)).toBeLessThan(0.5);
    expect(iceColor.getX(0)).toBeLessThan(0.5);
    expect(marbleColor.getX(0)).toBeLessThan(0.5);

    // classic '#3a2010' warm brown → R > G > B (ordering preserved by linearization)
    expect(classicColor.getX(0)).toBeGreaterThan(classicColor.getY(0));
    expect(classicColor.getY(0)).toBeGreaterThan(classicColor.getZ(0));

    // ice '#88c8e8' bluish → blue is the largest channel
    expect(iceColor.getZ(0)).toBeGreaterThan(iceColor.getX(0));
    expect(iceColor.getZ(0)).toBeGreaterThan(iceColor.getY(0));

    // marble '#8a7a6a' gray-brown → channels stay close to each other
    expect(Math.abs(marbleColor.getX(0) - marbleColor.getY(0))).toBeLessThan(0.1);
    expect(Math.abs(marbleColor.getY(0) - marbleColor.getZ(0))).toBeLessThan(0.1);
  });

  it('returns empty geometry for empty blocks array', () => {
    const geo = mergeEdgeGeometries([], 'classic');
    expect(geo.attributes.position.count).toBe(0);
    expect(geo.attributes.color.count).toBe(0);
  });

  it('positions vertices at correct world-space coordinates after translation', () => {
    const singleBlock = [makeBlock(0, { position: [1.5, 2.0, 0.5], rotation: [0, 0, 0] })];
    const geo = mergeEdgeGeometries(singleBlock, 'classic');
    const pos = geo.attributes.position;
    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D));
    const origPos = edgesGeo.attributes.position;

    for (let v = 0; v < origPos.count; v++) {
      expect(pos.getX(v)).toBeCloseTo(origPos.getX(v) + 1.5, 3);
      expect(pos.getY(v)).toBeCloseTo(origPos.getY(v) + 2.0, 3);
      expect(pos.getZ(v)).toBeCloseTo(origPos.getZ(v) + 0.5, 3);
    }
  });

  it('correctly rotates vertices with 90-degree Y rotation', () => {
    const block = makeBlock(0, { position: [0, 0, 0], rotation: [0, Math.PI / 2, 0] });
    const geo = mergeEdgeGeometries([block], 'classic');
    const pos = geo.attributes.position;
    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D));
    const origPos = edgesGeo.attributes.position;

    // Find vertices on X-plane and verify they rotated to Z-plane
    for (let v = 0; v < origPos.count; v++) {
      const ox = origPos.getX(v), oy = origPos.getY(v), oz = origPos.getZ(v);
      // After 90° Y rotation: (x,y,z) → (z,y,-x)
      expect(pos.getX(v)).toBeCloseTo(oz, 2);
      expect(pos.getY(v)).toBeCloseTo(oy, 3);
      expect(pos.getZ(v)).toBeCloseTo(-ox, 2);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  Component tests — in jsdom, R3F elements render as HTMLUnknownElements
//  which is sufficient for structural verification.
// ═════════════════════════════════════════════════════════════════════════════

describe('InstancedBlocks component', () => {
  const defaultProps = {
    blocks: sampleBlocks,
    blockTheme: 'classic',
    lowPowerMode: false,
    onBlockClick: vi.fn(),
    onBlockHover: vi.fn(),
    onBlockUnhover: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when blocks array is empty (early return)', () => {
    const { container } = render(
      <InstancedBlocks {...defaultProps} blocks={[]} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders an instancedMesh element for non-empty blocks', () => {
    const { container } = render(<InstancedBlocks {...defaultProps} />);
    const mesh = container.querySelector('instancedmesh');
    expect(mesh).toBeTruthy();
  });

  it('renders lineSegments element when lowPowerMode is false', () => {
    const { container } = render(
      <InstancedBlocks {...defaultProps} lowPowerMode={false} />
    );
    expect(container.querySelector('linesegments')).toBeTruthy();
  });

  it('does NOT render lineSegments in lowPowerMode', () => {
    const { container } = render(
      <InstancedBlocks {...defaultProps} lowPowerMode={true} />
    );
    expect(container.querySelector('linesegments')).toBeNull();
  });

  it('renders meshStandardMaterial and lineBasicMaterial elements', () => {
    const { container } = render(<InstancedBlocks {...defaultProps} />);
    expect(container.querySelector('meshstandardmaterial')).toBeTruthy();
    expect(container.querySelector('linebasicmaterial')).toBeTruthy();
  });

  it('renders a group wrapper containing the mesh', () => {
    const { container } = render(<InstancedBlocks {...defaultProps} />);
    const group = container.querySelector('group');
    expect(group).toBeTruthy();
    const mesh = container.querySelector('instancedmesh');
    expect(group.contains(mesh)).toBe(true);
  });

  it('memoizes: re-render with identical props preserves DOM', () => {
    const { rerender, container } = render(<InstancedBlocks {...defaultProps} />);
    const firstHtml = container.innerHTML;

    rerender(<InstancedBlocks {...defaultProps} />);
    expect(container.innerHTML).toBe(firstHtml);
  });

  it('updates DOM when block count changes', () => {
    const { rerender, container } = render(<InstancedBlocks {...defaultProps} />);
    const fewerBlocks = sampleBlocks.slice(0, 1);

    rerender(<InstancedBlocks {...defaultProps} blocks={fewerBlocks} />);
    expect(container.querySelector('instancedmesh')).toBeTruthy();
  });

  it('re-renders without crashing when blockTheme prop changes', () => {
    const { rerender, container } = render(<InstancedBlocks {...defaultProps} />);

    // In jsdom the R3F reconciler has no real WebGL backend, so theme-driven
    // GPU-side changes (instance colors, textures) aren't observable in the DOM.
    // The meaningful assertion is that a theme change re-runs the render path
    // without throwing and the scene structure is preserved.
    expect(() => {
      rerender(<InstancedBlocks {...defaultProps} blockTheme="ice" />);
    }).not.toThrow();

    expect(container.querySelector('instancedmesh')).toBeTruthy();
    expect(container.querySelector('linesegments')).toBeTruthy();
  });
});
