import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ParticleEffect: визуальный эффект частиц при успешном ходе
 * Создает взрыв зелёных звезд в позиции блока
 */
export function ParticleEffect({ position, enabled = true, duration = 0.6 }) {
  const particlesRef = useRef(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!enabled || !particlesRef.current) return;

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 20;
    const positions = [];
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      // Стартовая позиция = позиция блока
      positions.push(position[0], position[1], position[2]);

      // Случайные скорости (разлёт в стороны)
      const angle = (Math.random() * Math.PI * 2);
      const elevAngle = Math.random() * Math.PI * 0.4 + 0.2; // 20-70 градусов вверх
      const speed = Math.random() * 3 + 1;

      const vx = Math.cos(angle) * Math.cos(elevAngle) * speed;
      const vy = Math.sin(elevAngle) * speed + 1; // добавляем вертикальную скорость
      const vz = Math.sin(angle) * Math.cos(elevAngle) * speed;

      velocities.push(vx, vy, vz);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    particleGeometry.userData.velocities = velocities;

    const particleMaterial = new THREE.PointsMaterial({
      color: '#44ff88',
      size: 0.08,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    const ref = particlesRef.current;
    ref.add(particles);

    elapsedRef.current = 0;

    return () => {
      particleGeometry.dispose();
      particleMaterial.dispose();
      if (ref) ref.remove(particles);
    };
  }, [position, enabled]);

  useFrame((_, delta) => {
    if (!enabled || !particlesRef.current || !particlesRef.current.children[0]) return;

    elapsedRef.current += delta;
    const progress = elapsedRef.current / duration;

    if (progress >= 1) {
      // Удалить частицы
      const child = particlesRef.current.children[0];
      if (child) {
        particlesRef.current.remove(child);
      }
      return;
    }

    const particles = particlesRef.current.children[0];
    if (!particles) return;

    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.geometry.userData.velocities;
    const particleCount = positions.length / 3;

    const gravity = -9.81;

    for (let i = 0; i < particleCount; i++) {
      const posIdx = i * 3;
      const velIdx = i * 3;

      // Обновляем позицию (масштабируем на delta)
      positions[posIdx] += velocities[velIdx] * delta;
      positions[posIdx + 1] += velocities[velIdx + 1] * delta;
      positions[posIdx + 2] += velocities[velIdx + 2] * delta;

      // Применяем гравитацию
      velocities[velIdx + 1] += gravity * delta;

      // Затухание скорости
      const damping = Math.pow(0.98, delta * 60);
      velocities[velIdx] *= damping;
      velocities[velIdx + 1] *= damping;
      velocities[velIdx + 2] *= damping;
    }

    particles.geometry.attributes.position.needsUpdate = true;

    // Затухание прозрачности
    particles.material.opacity = 1 - progress;
  });

  return <group ref={particlesRef} />;
}

export default ParticleEffect;
