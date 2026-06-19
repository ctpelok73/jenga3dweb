import React from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

import { BLOCK_W, BLOCK_H, BLOCK_D, BLOCK_PHYSICS } from '../towerConfig';

// ─── Physics wrappers ───
// @react-three/rapier contract:
//   * RigidBody → kinematic state only (type, position/rotation set via API).
//   * CuboidCollider (and friends) → contact material: restitution + friction.
// Passing `restitution`/`friction` to RigidBody is silently ignored and defaults to
// Rapier built-ins (~restitution=0.5), which makes blocks feel bouncy.
// All material props live on colliders through these wrappers.
// ──────────────────────────────────────────────────────────────────────────────

export function FixedBody({ position = [0, -0.05, 0], args, restitution = 0, friction = 0.9, children }) {
  return (
    <RigidBody type="fixed" position={position}>
      <CuboidCollider args={args} restitution={restitution} friction={friction} />
      {children}
    </RigidBody>
  );
}

export const BlockBody = React.forwardRef(function BlockBody(
  {
    position,
    rotation,
    type,
    colliderArgs = [BLOCK_W / 2, BLOCK_H / 2, BLOCK_D / 2],
    restitution = BLOCK_PHYSICS.restitution,
    friction = BLOCK_PHYSICS.friction,
    userData,
    children,
  },
  ref,
) {
  return (
    <RigidBody
      ref={ref}
      type={type}
      position={position}
      rotation={rotation}
      colliders={false}
      mass={BLOCK_PHYSICS.mass}
      linearDamping={BLOCK_PHYSICS.linearDamping}
      angularDamping={BLOCK_PHYSICS.angularDamping}
      userData={userData}
    >
      <CuboidCollider args={colliderArgs} restitution={restitution} friction={friction} />
      {children}
    </RigidBody>
  );
});
