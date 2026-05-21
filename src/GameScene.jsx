import React, { Suspense, lazy, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const GameSceneWithPhysics = lazy(() => import('./GameSceneWithPhysics'));

function LoadingScene() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#b5651d" />
      </mesh>
    </>
  );
}

// ─── Fix #8: ErrorBoundary around Canvas ───
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Jenga 3D] ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#1a1410', color: '#fff', fontFamily: 'Arial, sans-serif',
          flexDirection: 'column', gap: 16
        }}>
          <h2>⚠ Ошибка 3D-сцены</h2>
          <p style={{ color: '#ff6666', maxWidth: 400, textAlign: 'center', fontSize: 14 }}>
            {this.state.error?.message || 'Неизвестная ошибка'}
          </p>
          <p style={{ fontSize: 13, color: '#aaa' }}>
            Попробуйте перезагрузить страницу или проверить поддержку WebGL.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              background: '#2a6eff', color: '#fff', fontSize: 14, cursor: 'pointer'
            }}
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function GameScene({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, restartKey, dropSlots, onDropSlot, lastMovedBlockId }) {
  return (
    <ErrorBoundary>
      <Canvas
        camera={{ position: [5, 3.5, 5], fov: 50 }}
        style={{ width: '100%', height: '100%', display: 'block', background: '#2a2a2a' }}
      >
        <Suspense fallback={<LoadingScene />}>
          <GameSceneWithPhysics
            blocks={blocks}
            selectedId={selectedId}
            onBlockClick={onBlockClick}
            simulatingBlockIds={simulatingBlockIds}
            onSimulationComplete={onSimulationComplete}
            restartKey={restartKey}
            dropSlots={dropSlots}
            onDropSlot={onDropSlot}
            lastMovedBlockId={lastMovedBlockId}
          />
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.1} minDistance={2} maxDistance={12} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </ErrorBoundary>
  );
}
