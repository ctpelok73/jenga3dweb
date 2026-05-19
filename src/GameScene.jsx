import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

// ─── Константы ────────────────────────────────────────────────────────────────
const BLOCK_W = 1.5;   // длина
const BLOCK_H = 0.5;   // высота
const BLOCK_D = 0.5;   // ширина
const GAP = 0.04;      // зазор между блоками в слое
const LAYER_GAP = 0.04; // зазор между слоями
const TOWER_LAYERS = 18; // количество слоёв
const BLOCKS_PER_LAYER = 3;
const FALL_THRESHOLD = -2; // если центр блока ниже этого — считаем упавшим
const TILT_THRESHOLD = 0.5; // допустимый наклон башни (по смещению центра)

const WOOD_COLORS = [
  '#b5651d', '#a0522d', '#8b4513', '#cd853f', '#deb887',
  '#d2b48c', '#c19a6b', '#b8860b', '#daa520', '#bc8f8f',
];

// ─── Компонент отдельного блока ────────────────────────────────────────────────
function Block({ id, position, rotation, color, onClick, isSelected }) {
  const rigidRef = useRef(null);

  return (
    <RigidBody
      ref={rigidRef}
      type="dynamic"
      position={position}
      rotation={rotation}
      colliders={false}
      mass={0.5}
      restitution={0.05}
      friction={0.7}
      linearDamping={0.1}
      angularDamping={0.3}
      userData={{ id }}
    >
      <CuboidCollider args={[BLOCK_W / 2, BLOCK_H / 2, BLOCK_D / 2]} />
      <mesh onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <boxGeometry args={[BLOCK_W, BLOCK_H, BLOCK_D]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0.05}
          emissive={isSelected ? '#4488ff' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
        {/* Контуры граней */}
        <Edges color="#3a2010" threshold={15} />
      </mesh>
    </RigidBody>
  );
}

// Tiny helper — рисует рёбра блока
function Edges({ color, threshold }) {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D)]} />
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}

// ─── Генератор башни ────────────────────────────────────────────────────────────
function generateTower() {
  const blocks = [];
  let id = 0;

  for (let layer = 0; layer < TOWER_LAYERS; layer++) {
    const y = layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = layer % 2 === 1;
    const halfSpan = (BLOCKS_PER_LAYER - 1) * (BLOCK_D + GAP) / 2;

    for (let b = 0; b < BLOCKS_PER_LAYER; b++) {
      const x = isOdd ? 0 : -halfSpan + b * (BLOCK_D + GAP);
      const z = isOdd ? -halfSpan + b * (BLOCK_D + GAP) : 0;
      const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
      const color = WOOD_COLORS[id % WOOD_COLORS.length];

      blocks.push({
        id,
        position: [x, y, z],
        rotation: rot,
        color,
        layer,
      });
      id++;
    }
  }
  return blocks;
}

// ─── Детектор падения ──────────────────────────────────────────────────────────
function useFallDetector(blockRefs, setGameOver, setIsFalling) {
  useFrame(() => {
    let anyFallen = false;
    for (const ref of blockRefs.current) {
      if (ref.current) {
        const t = ref.current.translation();
        if (t.y < FALL_THRESHOLD) {
          anyFallen = true;
          break;
        }
      }
    }
    if (anyFallen) {
      setGameOver(true);
      setIsFalling(false);
    }
  });
}

// ─── UI-панель (HTML поверх canvas) ────────────────────────────────────────────
function UIPanel({
  selectedId,
  canMove,
  onMakeMove,
  onRestart,
  gameOver,
  message,
  towerHeight,
  turnCount,
}) {
  return (
    <Html center={false} fullscreen>
      <div style={styles.overlay}>
        <div style={styles.panel}>
          <h2 style={styles.title}>Jenga 3D</h2>
          {gameOver && <div style={styles.gameOver}>💥 Башня рухнула!</div>}
          <div style={styles.info}>
            {message && <div style={styles.message}>{message}</div>}
            <div>Слой: {towerHeight}</div>
            <div>Ходов: {turnCount}</div>
          </div>
          <div style={styles.buttons}>
            <button
              style={{ ...styles.btn, opacity: canMove ? 1 : 0.4 }}
              disabled={!canMove}
              onClick={onMakeMove}
            >
              Сделать ход
            </button>
            <button style={styles.btn} onClick={onRestart}>
              Новая игра
            </button>
          </div>
        </div>
      </div>
    </Html>
  );
}

const styles = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    fontFamily: 'Arial, sans-serif',
  },
  panel: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(16, 19, 26, 0.85)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: 12,
    backdropFilter: 'blur(6px)',
    textAlign: 'center',
    pointerEvents: 'auto',
    minWidth: 200,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  title: { margin: '0 0 8px', fontSize: 20 },
  gameOver: { color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  info: { fontSize: 14, marginBottom: 10, lineHeight: 1.6 },
  message: { color: '#ffcc00', marginBottom: 4 },
  buttons: { display: 'flex', gap: 10, justifyContent: 'center' },
  btn: {
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    background: '#2a6eff',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

// ─── Основная сцена ────────────────────────────────────────────────────────────
function Scene() {
  const [blocks, setBlocks] = useState(() => generateTower());
  const [selectedId, setSelectedId] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [message, setMessage] = useState('');
  const [turnCount, setTurnCount] = useState(0);

  // Рефы для физических тел
  const rigidRefs = useRef({});

  // Текущая высота башни
  const towerHeight = useMemo(() => {
    let maxLayer = 0;
    for (const b of blocks) {
      if (b.layer > maxLayer) maxLayer = b.layer;
    }
    return maxLayer + 1;
  }, [blocks]);

  // Выбранный блок
  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId),
    [blocks, selectedId]
  );

  // Можно ли сделать ход?
  const canMove = selectedBlock !== undefined && !gameOver;

  // Обработчик клика по блоку
  const handleBlockClick = useCallback(
    (id) => {
      if (gameOver) return;
      setSelectedId((prev) => (prev === id ? null : id));
      setMessage('');
    },
    [gameOver]
  );

  // Сделать ход — перенести блок наверх
  const handleMakeMove = useCallback(() => {
    if (!canMove || !selectedBlock) return;

    // Определяем, какой слой сверху
    const maxLayer = blocks.reduce((m, b) => Math.max(m, b.layer), 0);
    const topLayerBlocks = blocks.filter((b) => b.layer === maxLayer);

    let newLayer = maxLayer;
    let slotIndex = topLayerBlocks.length;

    if (topLayerBlocks.length >= BLOCKS_PER_LAYER) {
      // Новый слой
      newLayer = maxLayer + 1;
      slotIndex = 0;
    }

    // Вычисляем новую позицию
    const y = newLayer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = newLayer % 2 === 1;
    const halfSpan = ((BLOCKS_PER_LAYER - 1) * (BLOCK_D + GAP)) / 2;
    let newX, newZ, newRot;

    if (isOdd) {
      newX = 0;
      newZ = -halfSpan + slotIndex * (BLOCK_D + GAP);
      newRot = [0, Math.PI / 2, 0];
    } else {
      newX = -halfSpan + slotIndex * (BLOCK_D + GAP);
      newZ = 0;
      newRot = [0, 0, 0];
    }

    // Телепортируем физическое тело блока на новую позицию
    const rigid = rigidRefs.current[selectedBlock.id];
    if (rigid) {
      rigid.setTranslation({ x: newX, y, z: newZ }, true);
      rigid.setRotation({ x: newRot[0], y: newRot[1], z: newRot[2], w: 1 }, true);
      rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Обновляем состояние блока
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === selectedBlock.id
          ? { ...b, position: [newX, y, newZ], rotation: newRot, layer: newLayer }
          : b
      )
    );

    setSelectedId(null);
    setTurnCount((c) => c + 1);
    setMessage(`Блок ${selectedBlock.id + 1} перенесён на слой ${newLayer + 1}`);

    // Запускаем проверку устойчивости через небольшую задержку (чтобы физика устаканилась)
    setIsFalling(true);
    setTimeout(() => {
      setIsFalling(false);
      checkStability();
    }, 800);
  }, [canMove, selectedBlock, blocks]);

  // Упрощённая проверка устойчивости
  const checkStability = useCallback(() => {
    // Смотрим, не слишком ли сильно разъехались верхние блоки
    const topBlocks = blocks.filter((b) => b.layer > TOWER_LAYERS - 3);
    if (topBlocks.length < 2) return;

    let maxDrift = 0;
    for (const b of topBlocks) {
      const rigid = rigidRefs.current[b.id];
      if (rigid) {
        const t = rigid.translation();
        const [origX, , origZ] = b.position;
        const drift = Math.sqrt((t.x - origX) ** 2 + (t.z - origZ) ** 2);
        if (drift > maxDrift) maxDrift = drift;
      }
    }

    if (maxDrift > TILT_THRESHOLD) {
      setGameOver(true);
      setMessage('💥 Башня слишком наклонилась! Проигрыш.');
    }
  }, [blocks]);

  // Сброс игры
  const handleRestart = useCallback(() => {
    setBlocks(generateTower());
    setSelectedId(null);
    setGameOver(false);
    setIsFalling(false);
    setMessage('');
    setTurnCount(0);
    rigidRefs.current = {};
  }, []);

  // Периодическая проверка падения
  useEffect(() => {
    if (!isFalling) return;
    const interval = setInterval(() => {
      for (const id in rigidRefs.current) {
        const rigid = rigidRefs.current[id];
        if (rigid) {
          const t = rigid.translation();
          if (t.y < FALL_THRESHOLD) {
            setGameOver(true);
            setIsFalling(false);
            setMessage('💥 Башня рухнула!');
            clearInterval(interval);
            return;
          }
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isFalling]);

  return (
    <>
      {/* Освещение */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#87ceeb', '#3a2010', 0.6]} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <pointLight position={[0, 15, 0]} intensity={0.3} color="#ffddaa" />

      {/* Блоки */}
      {blocks.map((b) => (
        <Block
          key={b.id}
          id={b.id}
          position={b.position}
          rotation={b.rotation}
          color={b.color}
          onClick={handleBlockClick}
          isSelected={b.id === selectedId}
        />
      ))}

      {/* Пол */}
      <RigidBody type="fixed" position={[0, -0.25, 0]}>
        <mesh>
          <boxGeometry args={[10, 0.5, 10]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
        </mesh>
      </RigidBody>

      {/* Небольшая решётка/пол для красоты */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>

      {/* UI */}
      <UIPanel
        selectedId={selectedId}
        canMove={canMove}
        onMakeMove={handleMakeMove}
        onRestart={handleRestart}
        gameOver={gameOver}
        message={message}
        towerHeight={towerHeight}
        turnCount={turnCount}
      />
    </>
  );
}

// ─── Корневой компонент с Canvas ──────────────────────────────────────────────
export default function GameScene() {
  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 45 }}
      shadows
      gl={{ antialias: true }}
      style={{ background: '#10131a' }}
      onPointerMissed={() => {}}
    >
      {/* Туман */}
      <fog attach="fog" args={['#10131a', 12, 25]} />
      <Physics gravity={[0, -9.81, 0]} debug={false}>
        <Scene />
      </Physics>
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={4}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}