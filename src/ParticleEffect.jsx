import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WOOD_COLORS = ['#b5651d', '#a0522d', '#8b4513', '#cd853f', '#deb887', '#d2b48c'];
const MAIN_PARTICLE_COUNT = 40;
const DUST_PARTICLE_COUNT = 15;
const TOTAL_PARTICLES = MAIN_PARTICLE_COUNT + DUST_PARTICLE_COUNT;

/**
 * ParticleEffect: visually impressive wood-debris + dust cloud effect
 * on successful block move. Each particle has its own color, size, and velocity.
 */
export function ParticleEffect({ position, enabled = true, duration = 0.6 }) {
  const groupRef = useRef(null);
  const elapsedRef = useRef(0);
  const dataRef = useRef(null);

  // Build particle data once when position/enabled changes
  useEffect(() => {
    if (!enabled || !groupRef.current) return;

    const positions = new Float32Array(TOTAL_PARTICLES * 3);
    const colors = new Float32Array(TOTAL_PARTICLES * 3);
    const sizes = new Float32Array(TOTAL_PARTICLES);

    const velocities = new Float32Array(TOTAL_PARTICLES * 3);
    const isDust = new Uint8Array(TOTAL_PARTICLES); // 0 = main, 1 = dust

    const tmpColor = new THREE.Color();

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const idx3 = i * 3;
      const dust = i >= MAIN_PARTICLE_COUNT;
      isDust[i] = dust ? 1 : 0;

      // Start at block position with slight jitter
      positions[idx3]     = position[0] + (Math.random() - 0.5) * 0.2;
      positions[idx3 + 1] = position[1] + (Math.random() - 0.5) * 0.1;
      positions[idx3 + 2] = position[2] + (Math.random() - 0.5) * 0.2;

      // Pick a random wood color
      tmpColor.set(WOOD_COLORS[Math.floor(Math.random() * WOOD_COLORS.length)]);
      colors[idx3]     = tmpColor.r;
      colors[idx3 + 1] = tmpColor.g;
      colors[idx3 + 2] = tmpColor.b;

      if (dust) {
        // Dust cloud: small, slow, wider horizontal spread
        sizes[i] = 0.015 + Math.random() * 0.015; // 0.015 - 0.03

        const angle = Math.random() * Math.PI * 2;
        const hSpeed = Math.random() * 1.2 + 0.3;
        velocities[idx3]     = Math.cos(angle) * hSpeed;
        velocities[idx3 + 1] = Math.random() * 0.6 + 0.1; // gentle upward drift
        velocities[idx3 + 2] = Math.sin(angle) * hSpeed;
      } else {
        // Main debris: varied sizes, wider horizontal, less vertical initially
        sizes[i] = 0.02 + Math.random() * 0.08; // 0.02 - 0.10

        const angle = Math.random() * Math.PI * 2;
        const elevAngle = Math.random() * Math.PI * 0.25 + 0.1; // 6-20 degrees — mostly horizontal
        const speed = Math.random() * 3.5 + 1.5;

        velocities[idx3]     = Math.cos(angle) * Math.cos(elevAngle) * speed;
        velocities[idx3 + 1] = Math.sin(elevAngle) * speed * 0.6; // reduced initial vertical
        velocities[idx3 + 2] = Math.sin(angle) * Math.cos(elevAngle) * speed;
      }
    }

    // Build geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom ShaderMaterial so each particle can have its own color + size
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uOpacity: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec3 vColor;
        void main() {
          // Soft circular particle
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.2, d) * uOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    const ref = groupRef.current;
    ref.add(points);

    dataRef.current = {
      geometry,
      material,
      points,
      velocities,
      isDust,
      startPositions: new Float32Array(positions), // copy for rotation reference
    };
    elapsedRef.current = 0;

    return () => {
      geometry.dispose();
      material.dispose();
      if (ref) ref.remove(points);
      dataRef.current = null;
    };
  }, [position, enabled]);

  useFrame((_, delta) => {
    if (!enabled || !dataRef.current) return;

    const data = dataRef.current;
    elapsedRef.current += delta;
    const progress = elapsedRef.current / duration;

    if (progress >= 1) {
      // Remove particles and dispose GPU resources when done
      if (groupRef.current && data.points.parent) {
        groupRef.current.remove(data.points);
      }
      data.geometry.dispose();
      data.material.dispose();
      dataRef.current = null;
      return;
    }

    const posAttr = data.geometry.attributes.position;
    const positions = posAttr.array;
    const velocities = data.velocities;
    const isDust = data.isDust;

    const gravity = -9.81;
    const rotationSpeed = 0.8;

    // Предвычисляем damping один раз за кадр (вместо 55 раз в цикле)
    const dampingFactor = delta * 60;
    const mainDamping = Math.pow(0.975, dampingFactor);
    const dustDamping = Math.pow(0.985, dampingFactor);

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const idx3 = i * 3;
      const dust = isDust[i] === 1;

      // Apply velocity
      positions[idx3]     += velocities[idx3]     * delta;
      positions[idx3 + 1] += velocities[idx3 + 1] * delta;
      positions[idx3 + 2] += velocities[idx3 + 2] * delta;

      // Apply gravity (weaker for dust)
      const gFactor = dust ? 0.15 : 1.0;
      velocities[idx3 + 1] += gravity * gFactor * delta;

      // Damping (dust fades slower / less damping) — используем предвычисленные значения
      const damping = dust ? dustDamping : mainDamping;
      velocities[idx3]     *= damping;
      velocities[idx3 + 1] *= damping;
      velocities[idx3 + 2] *= damping;

      // Add slight rotation around the origin (spiral effect)
      if (!dust) {
        const dx = positions[idx3]     - position[0];
        const dz = positions[idx3 + 2] - position[2];
        const angle = rotationSpeed * delta;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const newDx = dx * cosA - dz * sinA;
        const newDz = dx * sinA + dz * cosA;
        positions[idx3]     = position[0] + newDx;
        positions[idx3 + 2] = position[2] + newDz;
      }
    }

    posAttr.needsUpdate = true;

    // Opacity: main particles fade linearly, dust fades slower (quadratic ease)
    // We use a single uniform for simplicity — dust's slower fade is handled
    // by its reduced gravity keeping it visible longer
    const mainOpacity = 1 - progress;
    data.material.uniforms.uOpacity.value = mainOpacity;
  });

  return <group ref={groupRef} />;
}

export default ParticleEffect;
