import React, { Suspense, lazy, Component, useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getEnvironmentTheme } from './blockTextures';

const GameSceneWithPhysics = lazy(() => import('./GameSceneWithPhysics'));

function LoadingOverlay() {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(26,20,16,0.95)', color: '#fff', zIndex: 15,
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      flexDirection: 'column', gap: 16, pointerEvents: 'auto',
    }}>
      <div style={{ fontSize: 40 }}>🧱</div>
      <div style={{ fontSize: 16, fontWeight: 'bold' }}>
        Загрузка 3D-сцены{'.'.repeat(dots)}
      </div>
      <div style={{
        width: 180, height: 4, borderRadius: 2,
        background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
      }}>
        <div style={{
          width: '60%', height: '100%', borderRadius: 2,
          background: '#2a6eff',
          animation: 'loadingSlide 1.2s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes loadingSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(80%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

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

export default function GameScene({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, restartKey, dropSlots, onDropSlot, lastMovedBlockId, blockTheme, envTheme, keyboardFocusId }) {
  const env = useMemo(() => getEnvironmentTheme(envTheme), [envTheme]);
  const [physicsLoaded, setPhysicsLoaded] = useState(false);

  const handlePhysicsLoaded = useMemo(() => () => setPhysicsLoaded(true), []);

  return (
    <ErrorBoundary>
      {!physicsLoaded && <LoadingOverlay />}
      <Canvas
        camera={{ position: [5, 3.5, 5], fov: 50 }}
        style={{ width: '100%', height: '100%', display: 'block', background: env.bgColor }}
        shadows
        aria-hidden="true"
      >
        <Suspense fallback={null}>
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
            blockTheme={blockTheme}
            envTheme={envTheme}
            keyboardFocusId={keyboardFocusId}
            onReady={handlePhysicsLoaded}
          />
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.1} minDistance={2} maxDistance={12} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </ErrorBoundary>
  );
}