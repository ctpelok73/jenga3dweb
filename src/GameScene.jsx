import React, { Suspense, lazy, Component, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getEnvironmentTheme } from './blockTextures';
import LoadingProgressBar from './components/LoadingProgressBar';
import { wasmLoader } from './wasmLoader';

const GameSceneWithPhysics = lazy(() => import('./GameSceneWithPhysics'));

function LoadingOverlay() {
  const [dots, setDots] = useState(0);
  const [wasmProgress, setWasmProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setWasmProgress(wasmLoader.getProgress());
    }, 100);
    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="j-loading-overlay">
      <div className="j-loading-overlay__icon">🧱</div>
      <div className="j-loading-overlay__text">
        Загрузка 3D-сцены{'.'.repeat(dots)}
      </div>
      <div className="j-loading-overlay__bar">
        <div className="j-loading-overlay__progress" style={{ width: `${wasmProgress}%` }} />
      </div>
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
        <div className="j-error-boundary">
          <h2>⚠ Ошибка 3D-сцены</h2>
          <p className="j-error-boundary__message">
            {this.state.error?.message || 'Неизвестная ошибка'}
          </p>
          <p className="j-error-boundary__hint">
            Попробуйте перезагрузить страницу или проверить поддержку WebGL.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="j-error-boundary__retry"
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function GameScene({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, restartKey, dropSlots, onDropSlot, lastMovedBlockId, lastExtractionPosition, blockTheme, envTheme, keyboardFocusId }) {
  const env = useMemo(() => getEnvironmentTheme(envTheme), [envTheme]);
  const [physicsLoaded, setPhysicsLoaded] = useState(false);

  const handlePhysicsLoaded = useCallback(() => setPhysicsLoaded(true), []);

  return (
    <ErrorBoundary>
      {!physicsLoaded && <LoadingOverlay />}
      <Canvas
        camera={{ position: [7, 4, 7], fov: 60 }}
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
            lastExtractionPosition={lastExtractionPosition}
            blockTheme={blockTheme}
            envTheme={envTheme}
            keyboardFocusId={keyboardFocusId}
            onReady={handlePhysicsLoaded}
          />
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.1} minDistance={2} maxDistance={15} maxPolarAngle={Math.PI / 2.1} target={[0, 2.7, 0]} />
      </Canvas>
    </ErrorBoundary>
  );
}