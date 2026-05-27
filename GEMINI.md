# GEMINI.md - Jenga 3D Project Context

## Project Overview
**Jenga 3D** is a high-performance, physics-driven 3D game built with **React 19**, **Three.js** (via `@react-three/fiber` and `@react-three/drei`), and **Rapier Physics** (`@react-three/rapier`). It features a classic Jenga tower with advanced AI, a replay system, and extensive performance optimizations for both desktop and mobile devices.

### Main Technologies
- **Frontend:** React 19, Vite 8
- **3D Engine:** Three.js, React-Three-Fiber, R3F-Drei
- **Physics:** @react-three/rapier (WASM-based)
- **State Management:** React Hooks (useState, useMemo, useCallback, useRef)
- **Optimization:** Custom `physicsOptimizer` (LOD, Adaptive Frame Rate)
- **Services:** Firebase (Analytics), PWA support

### Architecture
- **`src/App.jsx`**: Central controller managing game phases (`start`, `playing`, `gameOver`), turn logic, AI execution, and UI state.
- **`src/GameSceneWithPhysics.jsx`**: Core 3D scene containing the tower, physics simulation, and environment. Integrates `physicsOptimizer` for performance.
- **`src/physicsOptimizer.js`**: Implements `AdaptiveFrameRateController`, `PhysicsLODManager`, and `CollisionCache` to maintain 60fps.
- **`src/aiControllerAdvanced.js`**: Intelligent AI featuring stability analysis, minimax algorithms, and distinct personalities (aggressive, normal, conservative).
- **`src/shareService.js`**: Manages game replays (save/load) and shareable challenge links (Base64 encoded).
- **`src/achievementsExtended.js`**: Tracking for 20 unique achievements across various categories.

---

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)
- npm or yarn

### Key Commands
- **Install Dependencies:** `npm install`
- **Development Mode:** `npm run dev` (Runs Vite dev server at `http://localhost:5173`)
- **Production Build:** `npm run build` (Optimized chunks for React, Three, R3F, Rapier, and Firebase)
- **Preview Build:** `npm run preview` (Locally serve the production build)

---

## Development Conventions

### Coding Style
- **React:** Functional components with hooks. Extensive use of `useMemo` and `useCallback` to prevent unnecessary re-renders in the 3D loop.
- **3D Optimization:**
    - Use `memo` for 3D components like `Block` and `DropSlot`.
    - Prefer shared geometries (`sharedBlockGeometry`, `sharedEdgesGeometry`) to save memory.
    - Leverage `physicsOptimizer` when adding dynamic physical objects.
- **Physics:** Rigid bodies should be `fixed` when not part of the active move/collapse to minimize Rapier's workload.

### Documentation
- **`DEVELOPMENT_PLAN.md`**: Tracks the long-term roadmap (5 Priorities). Current state: Priorities 1 & 2 are 100% complete.
- **`MODULES_GUIDE.md`**: Detailed technical documentation for core modules (`physicsOptimizer`, `aiControllerAdvanced`, etc.).
- **`INTEGRATION_GUIDE.md`**: Specific instructions for wiring new modules into the main `App.jsx`.
- **`SUMMARY.md`**: High-level report of the latest major development session (May 24, 2026).

---

## Current Roadmap (Next Steps)
- **Priority 3 (Pending):** Battle Pass system, seasonal skins, and ad/subscription monetization.
- **Priority 4 (Pending):** New game modes (Endless, Time Attack, Puzzle) and visual polish (particles, screen shake).
- **Priority 5 (Pending):** Infrastructure improvements, including Sentry integration, Unit tests (Jest), and E2E tests (Playwright).

---
*Last updated: 2026-05-25*
