import React, { Suspense, lazy, Component, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { getEnvironmentTheme } from './blockTextures';
import LoadingProgressBar from './components/LoadingProgressBar';
import { wasmLoader } from './wasmLoader';
import { useMobileOptimizations, RENDER_QUALITY, DEVICE_LEVELS } from './mobileOptimizations';

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

export default function GameScene({ blocks, selectedId, onBlockClick, simulatingBlockIds, onSimulationComplete, restartKey, dropSlots, onDropSlot, lastMovedBlockId, lastExtractionPosition, blockTheme, envTheme, keyboardFocusId, lowPowerMode = false, maxDynamicBlocks = null, onReady }) {
  const env = useMemo(() => getEnvironmentTheme(envTheme), [envTheme]);
  const [physicsLoaded, setPhysicsLoaded] = useState(false);
  const [webglResetKey, setWebglResetKey] = useState(0);
  const [webglDegraded, setWebglDegraded] = useState(false);
  const canvasCleanupRef = useRef(null);
  const contextRestoreTimeoutRef = useRef(null);

  // Используем новые настройки мобильной оптимизации
  const { renderSettings, deviceLevel, shouldOptimize } = useMobileOptimizations();

  // Приоритет: явный lowPowerMode > автоматические настройки
  const effectiveLowPowerMode = lowPowerMode || shouldOptimize || webglDegraded;
  const activeRenderSettings = useMemo(() => {
    if (webglDegraded) {
      return RENDER_QUALITY.LOW;
    }

    if (effectiveLowPowerMode) {
      return { ...renderSettings, antialias: false, shadows: false };
    }

    return RENDER_QUALITY.HIGH;
  }, [effectiveLowPowerMode, renderSettings, webglDegraded]);

  // Используем переданный maxDynamicBlocks или значение из настроек рендеринга
  const effectiveMaxDynamicBlocks = maxDynamicBlocks ?? activeRenderSettings.maxDynamicBlocks;

  const handlePhysicsLoaded = useCallback(() => setPhysicsLoaded(true), []);

  const handleCanvasCreated = useCallback(({ gl }) => {
    if (canvasCleanupRef.current) {
      canvasCleanupRef.current();
      canvasCleanupRef.current = null;
    }

    gl.shadowMap.type = THREE.PCFShadowMap;

    const canvas = gl.domElement;
    const handleContextLost = (event) => {
      event.preventDefault();
      console.warn('[Jenga 3D] WebGL context lost; rebuilding the renderer.');
      window.clearTimeout(contextRestoreTimeoutRef.current);
      contextRestoreTimeoutRef.current = window.setTimeout(() => {
        setWebglDegraded(true);
        setPhysicsLoaded(false);
        setWebglResetKey((key) => key + 1);
      }, 250);
    };

    const handleContextRestored = () => {
      console.info('[Jenga 3D] WebGL context restored.');
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    canvasCleanupRef.current = () => {
      window.clearTimeout(contextRestoreTimeoutRef.current);
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, []);

  useEffect(() => () => {
    if (canvasCleanupRef.current) {
      canvasCleanupRef.current();
      canvasCleanupRef.current = null;
    }
  }, []);

  // Настройки Canvas на основе уровня устройства
  // ВАЖНО: frameloop всегда 'always' — иначе в режиме 'demand' canvas
  // перестаёт рендерить кадры после симуляции и экран становится белым.
  // simulatingBlockIds намеренно убран из зависимостей, чтобы Canvas
  // не пересоздавался при каждом ходе.
  const canvasConfig = useMemo(() => ({
    camera: { position: [7, 4, 7], fov: 60 },
    dpr: activeRenderSettings.dpr,
    gl: {
      antialias: activeRenderSettings.antialias,
      powerPreference: effectiveLowPowerMode ? 'default' : 'high-performance',
      stencil: false,
      depth: true,
    },
    frameloop: 'always',
    performance: {
      min: effectiveLowPowerMode ? 0.35 : 0.5,
    },
    style: { width: '100%', height: '100%', display: 'block', background: env.bgColor },
    shadows: activeRenderSettings.shadows ? { type: THREE.PCFShadowMap } : false,
    'aria-hidden': 'true',
  }), [activeRenderSettings, effectiveLowPowerMode, env.bgColor]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ErrorBoundary>
        {!physicsLoaded && <LoadingOverlay />}
        <Canvas key={webglResetKey} {...canvasConfig} onCreated={handleCanvasCreated}>
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
              lowPowerMode={effectiveLowPowerMode}
              maxDynamicBlocks={effectiveMaxDynamicBlocks}
            />
          </Suspense>
          <OrbitControls
            enableDamping={!effectiveLowPowerMode}
            dampingFactor={effectiveLowPowerMode ? 0.05 : 0.1}
            minDistance={2}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 2.7, 0]}
          />
          {!effectiveLowPowerMode && !webglDegraded && (
            <Environment
              preset={
                envTheme === 'space' ? 'night' :
                envTheme === 'beach' ? 'sunset' :
                envTheme === 'library' ? 'warehouse' :
                'apartment'
              }
              background={false}
              environmentIntensity={0.4}
            />
          )}
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
