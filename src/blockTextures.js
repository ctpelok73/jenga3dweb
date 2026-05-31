import * as THREE from 'three';

const textureCache = new Map();

function createTexture(canvas, isDataMap = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (isDataMap) {
    texture.colorSpace = THREE.LinearSRGBColorSpace;
  }
  return texture;
}

function generateWoodTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  const grainCount = 12 + Math.floor(Math.random() * 8);
  for (let i = 0; i < grainCount; i++) {
    const y = Math.random() * height;
    const lineWidth = 0.5 + Math.random() * 1.5;
    const alpha = 0.08 + Math.random() * 0.15;

    ctx.strokeStyle = `rgba(60, 30, 10, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < width; x += 8) {
      const dy = (Math.random() - 0.5) * 2;
      ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }

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

  for (let x = 0; x < width; x += 2) {
    for (let y = 0; y < height; y += 2) {
      const brightness = Math.random() * 0.06;
      ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  return createTexture(canvas);
}

function generateNeonTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111122';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(0.3, baseColor);
  gradient.addColorStop(0.5, '#111122');
  gradient.addColorStop(0.7, baseColor);
  gradient.addColorStop(1, baseColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

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
  return createTexture(canvas);
}

function generateIceTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

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

  for (let x = 0; x < width; x += 3) {
    for (let y = 0; y < height; y += 3) {
      const b = Math.random() * 0.03;
      ctx.fillStyle = `rgba(255, 255, 255, ${b})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  return createTexture(canvas);
}

function generateBambooTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  const segmentCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < segmentCount; i++) {
    const y = Math.random() * height;
    ctx.strokeStyle = `rgba(80, 120, 40, ${0.3 + Math.random() * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.fillStyle = `rgba(60, 100, 30, ${0.15 + Math.random() * 0.1})`;
    ctx.fillRect(0, y - 2, width, 4);
  }

  for (let i = 0; i < 15; i++) {
    const x = Math.random() * width;
    ctx.strokeStyle = `rgba(100, 140, 60, ${0.08 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, height);
    ctx.stroke();
  }

  for (let x = 0; x < width; x += 2) {
    for (let y = 0; y < height; y += 2) {
      const b = Math.random() * 0.04;
      ctx.fillStyle = `rgba(0, 0, 0, ${b})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  return createTexture(canvas);
}

function generateCandyTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  const stripeCount = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < stripeCount; i++) {
    const x = (i / stripeCount) * width;
    const stripeWidth = width / stripeCount * 0.6;
    const isLight = i % 2 === 0;
    ctx.fillStyle = isLight
      ? `rgba(255, 255, 255, ${0.15 + Math.random() * 0.15})`
      : `rgba(0, 0, 0, ${0.08 + Math.random() * 0.08})`;
    ctx.fillRect(x, 0, stripeWidth, height);
  }

  for (let i = 0; i < 12; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = 1 + Math.random() * 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return createTexture(canvas);
}

function generateMarbleTexture(baseColor, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

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

  for (let i = 0; i < 6; i++) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    const pr = 5 + Math.random() * 15;
    ctx.fillStyle = `rgba(160, 140, 120, ${0.03 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(px, py, pr, pr * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let x = 0; x < width; x += 3) {
    for (let y = 0; y < height; y += 3) {
      const b = Math.random() * 0.04;
      ctx.fillStyle = `rgba(0, 0, 0, ${b})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  return createTexture(canvas);
}

function generateNormalMap(theme, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, width, height);

  switch (theme) {
    case 'classic': {
      for (let x = 0; x < width; x += 4) {
        for (let y = 0; y < height; y += 4) {
          const dx = (Math.random() - 0.5) * 40;
          const dy = (Math.random() - 0.5) * 40;
          ctx.fillStyle = `rgb(${Math.floor(128 + dx)}, ${Math.floor(128 + dy)}, 255)`;
          ctx.fillRect(x, y, 4, 4);
        }
      }
      break;
    }
    case 'neon': {
      for (let i = 0; i < 6; i++) {
        const y = 4 + Math.floor(Math.random() * (height - 8));
        ctx.strokeStyle = `rgb(140, 140, 255)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        ctx.strokeStyle = `rgb(118, 118, 250)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + 6);
        ctx.lineTo(width, y + 6);
        ctx.stroke();
      }
      for (let x = 0; x < width; x += 4) {
        for (let y = 0; y < height; y += 4) {
          const dx = (Math.random() - 0.5) * 15;
          const dy = (Math.random() - 0.5) * 15;
          ctx.fillStyle = `rgb(${Math.floor(128 + dx)}, ${Math.floor(128 + dy)}, 255)`;
          ctx.fillRect(x, y, 4, 4);
        }
      }
      break;
    }
    case 'marble': {
      for (let i = 0; i < 6; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        ctx.strokeStyle = `rgb(118, 118, 248)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        let cx = startX, cy = startY;
        for (let s = 0; s < 12; s++) {
          cx += (Math.random() - 0.5) * 18;
          cy += (Math.random() - 0.5) * 6;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      break;
    }
    case 'ice': {
      for (let i = 0; i < 10; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        const length = 15 + Math.random() * 35;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.4;
        ctx.strokeStyle = `rgb(130, 130, 255)`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const cx = Math.random() * width;
        const cy = Math.random() * height;
        const r = 3 + Math.random() * 6;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, 'rgb(140, 140, 255)');
        gradient.addColorStop(1, 'rgb(128, 128, 255)');
        ctx.fillStyle = gradient;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      break;
    }
    case 'bamboo': {
      for (let i = 0; i < 4; i++) {
        const y = Math.random() * height;
        ctx.fillStyle = 'rgb(118, 118, 248)';
        ctx.fillRect(0, y - 1, width, 3);
        ctx.fillStyle = 'rgb(130, 130, 255)';
        ctx.fillRect(0, y - 2, width, 5);
      }
      for (let i = 0; i < 18; i++) {
        const x = Math.random() * width;
        ctx.strokeStyle = 'rgb(126, 126, 253)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (Math.random() - 0.5) * 3, height);
        ctx.stroke();
      }
      break;
    }
    case 'candy': {
      const stripeCount = 8;
      for (let i = 0; i < stripeCount; i++) {
        const x = (i / stripeCount) * width;
        const stripeWidth = width / stripeCount * 0.6;
        ctx.fillStyle = i % 2 === 0 ? 'rgb(135, 135, 255)' : 'rgb(122, 122, 250)';
        ctx.fillRect(x, 0, stripeWidth, height);
      }
      for (let i = 0; i < 20; i++) {
        const cx = Math.random() * width;
        const cy = Math.random() * height;
        ctx.fillStyle = 'rgb(140, 140, 255)';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default: {
      for (let x = 0; x < width; x += 4) {
        for (let y = 0; y < height; y += 4) {
          const dx = (Math.random() - 0.5) * 30;
          const dy = (Math.random() - 0.5) * 30;
          ctx.fillStyle = `rgb(${Math.floor(128 + dx)}, ${Math.floor(128 + dy)}, 255)`;
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }
  }

  return createTexture(canvas, true);
}

function generateRoughnessMap(theme, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  switch (theme) {
    case 'classic': {
      ctx.fillStyle = 'rgb(190, 190, 190)';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 14; i++) {
        const y = Math.random() * height;
        const lineLength = 20 + Math.random() * 40;
        ctx.strokeStyle = `rgba(150, 150, 150, ${0.3 + Math.random() * 0.4})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * (width - lineLength), y);
        ctx.lineTo(Math.random() * lineLength + width - lineLength, y + (Math.random() - 0.5) * 3);
        ctx.stroke();
      }
      break;
    }
    case 'neon': {
      ctx.fillStyle = 'rgb(51, 51, 51)';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 8; i++) {
        const y = Math.random() * height;
        ctx.strokeStyle = 'rgba(20, 20, 20, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }
    case 'marble': {
      ctx.fillStyle = 'rgb(89, 89, 89)';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 8; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        ctx.strokeStyle = `rgba(70, 70, 70, ${0.3 + Math.random() * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        let cx = startX, cy = startY;
        for (let s = 0; s < 10; s++) {
          cx += (Math.random() - 0.5) * 18;
          cy += (Math.random() - 0.5) * 6;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      break;
    }
    case 'ice': {
      ctx.fillStyle = 'rgb(13, 13, 13)';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 6; i++) {
        const cx = Math.random() * width;
        const cy = Math.random() * height;
        const r = 6 + Math.random() * 12;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0.5)');
        gradient.addColorStop(1, 'rgba(15, 15, 15, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      break;
    }
    case 'bamboo': {
      ctx.fillStyle = 'rgb(153, 153, 153)';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 5; i++) {
        const y = Math.random() * height;
        ctx.fillStyle = 'rgba(140, 140, 140, 0.5)';
        ctx.fillRect(0, y - 2, width, 4);
      }
      for (let i = 0; i < 18; i++) {
        const x = Math.random() * width;
        ctx.strokeStyle = 'rgba(160, 160, 160, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (Math.random() - 0.5) * 3, height);
        ctx.stroke();
      }
      break;
    }
    case 'candy': {
      ctx.fillStyle = 'rgb(38, 38, 38)';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 10; i++) {
        const cx = Math.random() * width;
        const cy = Math.random() * height;
        const r = 2 + Math.random() * 5;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, 'rgba(25, 25, 25, 0.7)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      break;
    }
    default: {
      ctx.fillStyle = 'rgb(190, 190, 190)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  return createTexture(canvas, true);
}

// Separate cache for theme-only maps (normalMap, roughnessMap don't depend on color)
const themeMapCache = new Map();

function getThemeMaps(theme) {
  if (themeMapCache.has(theme)) {
    return themeMapCache.get(theme);
  }
  const maps = {
    normalMap: generateNormalMap(theme),
    roughnessMap: generateRoughnessMap(theme),
  };
  themeMapCache.set(theme, maps);
  return maps;
}

export function getBlockMaterialProps(theme, color) {
  const cacheKey = `${theme}:${color}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const { normalMap, roughnessMap } = getThemeMaps(theme);

  let props;
  switch (theme) {
    case 'classic':
      props = {
        map: generateWoodTexture(color),
        normalMap,
        roughnessMap,
        roughness: 0.75,
        metalness: 0.0,
        emissiveDefault: '#000000',
      };
      break;
    case 'neon':
      props = {
        map: generateNeonTexture(color),
        normalMap,
        roughnessMap,
        roughness: 0.2,
        metalness: 0.6,
        emissiveDefault: color,
        emissiveIntensityDefault: 0.15,
      };
      break;
    case 'marble':
      props = {
        map: generateMarbleTexture(color),
        normalMap,
        roughnessMap,
        roughness: 0.35,
        metalness: 0.1,
        emissiveDefault: '#000000',
      };
      break;
    case 'ice':
      props = {
        map: generateIceTexture(color),
        normalMap,
        roughnessMap,
        roughness: 0.05,
        metalness: 0.3,
        emissiveDefault: '#aaddff',
        emissiveIntensityDefault: 0.08,
      };
      break;
    case 'bamboo':
      props = {
        map: generateBambooTexture(color),
        normalMap,
        roughnessMap,
        roughness: 0.6,
        metalness: 0.0,
        emissiveDefault: '#000000',
      };
      break;
    case 'candy':
      props = {
        map: generateCandyTexture(color),
        normalMap,
        roughnessMap,
        roughness: 0.15,
        metalness: 0.1,
        emissiveDefault: color,
        emissiveIntensityDefault: 0.1,
      };
      break;
    default:
      props = {
        map: generateWoodTexture(color),
        normalMap,
        roughnessMap,
        roughness: 0.75,
        metalness: 0.0,
        emissiveDefault: '#000000',
      };
  }

  textureCache.set(cacheKey, props);
  return props;
}

export function clearTextureCache() {
  textureCache.forEach((props) => {
    if (props.map) props.map.dispose();
  });
  textureCache.clear();
  themeMapCache.forEach((maps) => {
    if (maps.normalMap) maps.normalMap.dispose();
    if (maps.roughnessMap) maps.roughnessMap.dispose();
  });
  themeMapCache.clear();
}

export const ENVIRONMENT_THEMES = {
  classic: {
    name: '🪵 Классика',
    groundColor: '#5a3a1a',
    groundRoughness: 0.85,
    groundSize: 8,
    groundMetalness: 0.05,
    fogColor: '#1e1610',
    fogNear: 10,
    fogFar: 28,
    bgColor: '#1e1610',
    ambientIntensity: 0.35,
    hemiSkyColor: '#ffecd2',
    hemiGroundColor: '#2a1a0a',
    hemiIntensity: 0.55,
    dirLights: [
      { position: [3, 10, 5], intensity: 1.0, color: '#ffd8a0' },
      { position: [-3, 7, -4], intensity: 0.35, color: '#ffbb77' },
      { position: [0, 5, -6], intensity: 0.15, color: '#cc8844' },
    ],
    spotLight: { position: [0, 12, 2], intensity: 0.8, color: '#fff0d0', angle: 0.5, penumbra: 0.7 },
    shadowEnabled: true,
    contactShadow: { opacity: 0.3, blur: 2.5 },
  },
  space: {
    name: '🌌 Космос',
    groundColor: '#0d0d22',
    groundRoughness: 0.4,
    groundSize: 12,
    groundMetalness: 0.3,
    fogColor: '#050510',
    fogNear: 8,
    fogFar: 25,
    bgColor: '#050510',
    ambientIntensity: 0.1,
    hemiSkyColor: '#3355cc',
    hemiGroundColor: '#080818',
    hemiIntensity: 0.25,
    dirLights: [
      { position: [4, 12, 6], intensity: 0.6, color: '#99bbff' },
      { position: [-5, 8, -3], intensity: 0.25, color: '#5577dd' },
      { position: [0, 6, 8], intensity: 0.15, color: '#8844cc' },
    ],
    spotLight: { position: [0, 14, 0], intensity: 2.0, color: '#ddeeff', angle: 0.35, penumbra: 0.5 },
    shadowEnabled: true,
    contactShadow: { opacity: 0.5, blur: 3.0 },
  },
  beach: {
    name: '🏖️ Пляж',
    groundColor: '#c4975a',
    groundRoughness: 0.92,
    groundSize: 14,
    groundMetalness: 0.0,
    fogColor: '#7ec8e3',
    fogNear: 12,
    fogFar: 35,
    bgColor: '#7ec8e3',
    ambientIntensity: 0.55,
    hemiSkyColor: '#89d4f5',
    hemiGroundColor: '#c4975a',
    hemiIntensity: 0.65,
    dirLights: [
      { position: [6, 12, 4], intensity: 1.2, color: '#fff8e8' },
      { position: [-4, 8, -6], intensity: 0.4, color: '#ffdca0' },
    ],
    spotLight: null,
    shadowEnabled: true,
    contactShadow: { opacity: 0.2, blur: 3.5 },
  },
  library: {
    name: '📚 Библиотека',
    groundColor: '#2c1d17',
    groundRoughness: 0.88,
    groundSize: 6,
    groundMetalness: 0.08,
    fogColor: '#120a04',
    fogNear: 5,
    fogFar: 16,
    bgColor: '#120a04',
    ambientIntensity: 0.18,
    hemiSkyColor: '#b8946c',
    hemiGroundColor: '#150c04',
    hemiIntensity: 0.35,
    dirLights: [
      { position: [2, 7, 3], intensity: 0.5, color: '#ffcc88' },
      { position: [-2, 5, -2], intensity: 0.2, color: '#ff8844' },
    ],
    spotLight: { position: [0, 10, 2], intensity: 2.5, color: '#ffd88a', angle: 0.3, penumbra: 0.85 },
    shadowEnabled: true,
    contactShadow: { opacity: 0.45, blur: 2.0 },
  },
};

export function getEnvironmentTheme(themeName) {
  return ENVIRONMENT_THEMES[themeName] || ENVIRONMENT_THEMES.classic;
}