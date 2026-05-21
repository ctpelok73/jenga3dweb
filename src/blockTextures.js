/**
 * blockTextures.js — процедурная генерация текстур для блоков Дженги
 * Использует Canvas2D для создания wood grain, neon glow, marble vein текстур
 * Генерируется один раз, кэшируется в Map
 */
import * as THREE from 'three';

const textureCache = new Map();

// ─── Wood grain texture ───
function generateWoodTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base fill
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Wood grain lines — horizontal streaks with slight variation
  const grainCount = 12 + Math.floor(Math.random() * 8);
  for (let i = 0; i < grainCount; i++) {
    const y = Math.random() * height;
    const lineWidth = 0.5 + Math.random() * 1.5;
    const alpha = 0.08 + Math.random() * 0.15;

    ctx.strokeStyle = `rgba(60, 30, 10, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, y);
    // Slightly wavy line
    for (let x = 0; x < width; x += 8) {
      const dy = (Math.random() - 0.5) * 2;
      ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }

  // Knots — small dark circles
  const knotCount = Math.floor(Math.random() * 2);
  for (let i = 0; i < knotCount; i++) {
    const kx = Math.random() * width;
    const ky = Math.random() * height;
    const kr = 2 + Math.random() * 4;
    ctx.fillStyle = `rgba(80, 40, 15, 0.2)`;
    ctx.beginPath();
    ctx.ellipse(kx, ky, kr, kr * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle noise overlay
  for (let x = 0; x < width; x += 2) {
    for (let y = 0; y < height; y += 2) {
      const brightness = Math.random() * 0.06;
      ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

// ─── Neon glow texture ───
function generateNeonTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Dark base
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, 0, width, height);

  // Neon color fill with gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(0.3, baseColor);
  gradient.addColorStop(0.5, '#111122');
  gradient.addColorStop(0.7, baseColor);
  gradient.addColorStop(1, baseColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Glow lines at edges
  ctx.shadowColor = baseColor;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(width, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, height - 2);
  ctx.lineTo(width, height - 2);
  ctx.stroke();

  // Circuit-like pattern
  ctx.shadowBlur = 4;
  ctx.lineWidth = 1;
  ctx.strokeStyle = baseColor;
  const lines = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < lines; i++) {
    const y = Math.random() * height;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width * 0.3, y);
    ctx.lineTo(Math.random() * width * 0.7 + width * 0.3, y);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ─── Ice/crystal texture ───
function generateIceTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Light icy base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Frost streaks — diagonal translucent lines
  for (let i = 0; i < 8; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const length = 20 + Math.random() * 40;
    const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
    ctx.strokeStyle = `rgba(200, 230, 255, ${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
    ctx.stroke();
  }

  // Crystal highlights — bright spots
  for (let i = 0; i < 5; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = 2 + Math.random() * 4;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(200, 230, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // Subtle noise
  for (let x = 0; x < width; x += 3) {
    for (let y = 0; y < height; y += 3) {
      const b = Math.random() * 0.03;
      ctx.fillStyle = `rgba(255, 255, 255, ${b})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ─── Bamboo texture ───
function generateBambooTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Green bamboo base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Vertical bamboo segments — horizontal lines across
  const segmentCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < segmentCount; i++) {
    const y = Math.random() * height;
    ctx.strokeStyle = `rgba(80, 120, 40, ${0.3 + Math.random() * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    // Node ring — slightly darker band
    ctx.fillStyle = `rgba(60, 100, 30, ${0.15 + Math.random() * 0.1})`;
    ctx.fillRect(0, y - 2, width, 4);
  }

  // Vertical grain lines
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * width;
    ctx.strokeStyle = `rgba(100, 140, 60, ${0.08 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, height);
    ctx.stroke();
  }

  // Subtle noise
  for (let x = 0; x < width; x += 2) {
    for (let y = 0; y < height; y += 2) {
      const b = Math.random() * 0.04;
      ctx.fillStyle = `rgba(0, 0, 0, ${b})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ─── Candy texture ───
function generateCandyTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Bright candy base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Swirl pattern — candy cane stripes
  const stripeCount = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < stripeCount; i++) {
    const x = (i / stripeCount) * width;
    const stripeWidth = width / stripeCount * 0.6;
    // Alternate lighter/darker stripes
    const isLight = i % 2 === 0;
    ctx.fillStyle = isLight
      ? `rgba(255, 255, 255, ${0.15 + Math.random() * 0.15})`
      : `rgba(0, 0, 0, ${0.08 + Math.random() * 0.08})`;
    ctx.fillRect(x, 0, stripeWidth, height);
  }

  // Sugar sparkles — small bright dots
  for (let i = 0; i < 12; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = 1 + Math.random() * 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glossy highlight band
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ─── Marble vein texture ───
function generateMarbleTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base fill — warm white/cream
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Marble veins — thin dark lines with branching
  const veinCount = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < veinCount; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const alpha = 0.08 + Math.random() * 0.12;
    ctx.strokeStyle = `rgba(80, 60, 40, ${alpha})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let cx = startX, cy = startY;
    const steps = 10 + Math.floor(Math.random() * 15);
    for (let s = 0; s < steps; s++) {
      cx += (Math.random() - 0.5) * 20;
      cy += (Math.random() - 0.5) * 8;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Subtle gray patches
  for (let i = 0; i < 6; i++) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    const pr = 5 + Math.random() * 15;
    ctx.fillStyle = `rgba(160, 140, 120, ${0.03 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(px, py, pr, pr * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine noise
  for (let x = 0; x < width; x += 3) {
    for (let y = 0; y < height; y += 3) {
      const b = Math.random() * 0.04;
      ctx.fillStyle = `rgba(0, 0, 0, ${b})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ─── Normal map generator (subtle surface detail) ───
function generateNormalMap(width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base neutral normal (blue = flat surface pointing up)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, width, height);

  // Subtle bumps
  for (let x = 0; x < width; x += 4) {
    for (let y = 0; y < height; y += 4) {
      const dx = (Math.random() - 0.5) * 30;
      const dy = (Math.random() - 0.5) * 30;
      const r = Math.floor(128 + dx);
      const g = Math.floor(128 + dy);
      ctx.fillStyle = `rgb(${r}, ${g}, 255)`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Get or create a cached texture for a block theme + color
 * Returns { map, normalMap, roughness, metalness, emissiveDefault }
 */
export function getBlockMaterialProps(theme, color) {
  const cacheKey = `${theme}:${color}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  let props;
  switch (theme) {
    case 'classic':
      props = {
        map: generateWoodTexture(color),
        normalMap: generateNormalMap(),
        roughness: 0.75,
        metalness: 0.0,
        emissiveDefault: '#000000',
      };
      break;
    case 'neon':
      props = {
        map: generateNeonTexture(color),
        normalMap: null,
        roughness: 0.2,
        metalness: 0.6,
        emissiveDefault: color,
        emissiveIntensityDefault: 0.15,
      };
      break;
    case 'marble':
      props = {
        map: generateMarbleTexture(color),
        normalMap: generateNormalMap(),
        roughness: 0.35,
        metalness: 0.1,
        emissiveDefault: '#000000',
      };
      break;
    case 'ice':
      props = {
        map: generateIceTexture(color),
        normalMap: generateNormalMap(),
        roughness: 0.05,
        metalness: 0.3,
        emissiveDefault: '#aaddff',
        emissiveIntensityDefault: 0.08,
      };
      break;
    case 'bamboo':
      props = {
        map: generateBambooTexture(color),
        normalMap: generateNormalMap(),
        roughness: 0.6,
        metalness: 0.0,
        emissiveDefault: '#000000',
      };
      break;
    case 'candy':
      props = {
        map: generateCandyTexture(color),
        normalMap: null,
        roughness: 0.15,
        metalness: 0.1,
        emissiveDefault: color,
        emissiveIntensityDefault: 0.1,
      };
      break;
    default:
      props = {
        map: generateWoodTexture(color),
        normalMap: generateNormalMap(),
        roughness: 0.75,
        metalness: 0.0,
        emissiveDefault: '#000000',
      };
  }

  textureCache.set(cacheKey, props);
  return props;
}

/**
 * Clear texture cache (when theme changes, textures need regeneration)
 */
export function clearTextureCache() {
  textureCache.forEach((props) => {
    if (props.map) props.map.dispose();
    if (props.normalMap) props.normalMap.dispose();
  });
  textureCache.clear();
}

// ─── Environment theme configs ───
export const ENVIRONMENT_THEMES = {
  classic: {
    name: '🪵 Классика',
    groundColor: '#6b4226',
    groundRoughness: 0.8,
    groundSize: 4,
    fogColor: '#2a2a2a',
    fogNear: 8,
    fogFar: 25,
    bgColor: '#2a2a2a',
    ambientIntensity: 0.4,
    hemiSkyColor: '#e8d5b0',
    hemiGroundColor: '#2a1a0a',
    hemiIntensity: 0.5,
    dirLights: [
      { position: [2, 8, 4], intensity: 0.8, color: '#ffddaa' },
      { position: [-2, 6, -3], intensity: 0.3, color: '#ffcc88' },
    ],
    spotLight: null,
    shadowEnabled: true,
  },
  space: {
    name: '🌌 Космос',
    groundColor: '#1a1a2e',
    groundRoughness: 0.6,
    groundSize: 8,
    fogColor: '#0a0a1e',
    fogNear: 6,
    fogFar: 20,
    bgColor: '#0a0a1e',
    ambientIntensity: 0.15,
    hemiSkyColor: '#4466ff',
    hemiGroundColor: '#000011',
    hemiIntensity: 0.3,
    dirLights: [
      { position: [3, 10, 5], intensity: 0.5, color: '#aaccff' },
      { position: [-4, 8, -2], intensity: 0.2, color: '#6688ff' },
    ],
    spotLight: { position: [0, 12, 0], intensity: 1.5, color: '#ffffff', angle: 0.4, penumbra: 0.6 },
    shadowEnabled: true,
  },
  beach: {
    name: '🏖️ Пляж',
    groundColor: '#d4a862',
    groundRoughness: 0.95,
    groundSize: 10,
    fogColor: '#87ceeb',
    fogNear: 10,
    fogFar: 30,
    bgColor: '#87ceeb',
    ambientIntensity: 0.5,
    hemiSkyColor: '#87ceeb',
    hemiGroundColor: '#d4a862',
    hemiIntensity: 0.6,
    dirLights: [
      { position: [5, 10, 3], intensity: 1.0, color: '#fff5e0' },
      { position: [-3, 6, -5], intensity: 0.4, color: '#ffe4b5' },
    ],
    spotLight: null,
    shadowEnabled: true,
  },
  library: {
    name: '📚 Библиотека',
    groundColor: '#3e2723',
    groundRoughness: 0.9,
    groundSize: 5,
    fogColor: '#1a1008',
    fogNear: 5,
    fogFar: 18,
    bgColor: '#1a1008',
    ambientIntensity: 0.25,
    hemiSkyColor: '#c8a882',
    hemiGroundColor: '#1a0e06',
    hemiIntensity: 0.4,
    dirLights: [
      { position: [1, 6, 2], intensity: 0.6, color: '#ffcc88' },
      { position: [-1, 4, -1], intensity: 0.2, color: '#ff9944' },
    ],
    spotLight: { position: [0, 10, 3], intensity: 2.0, color: '#ffe0a0', angle: 0.35, penumbra: 0.8 },
    shadowEnabled: true,
  },
};

export function getEnvironmentTheme(themeName) {
  return ENVIRONMENT_THEMES[themeName] || ENVIRONMENT_THEMES.classic;
}