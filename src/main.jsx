import React from 'react';
import { createRoot } from 'react-dom/client';
import './ui.css';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
if (import.meta.env.DEV) import('./profilerConsole');

// Подавляем известные предупреждения из сторонних библиотек,
// которые нельзя исправить в нашем коде.
const _warn = console.warn.bind(console);
console.warn = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  // THREE.Clock deprecated → используется внутри @react-three/fiber
  if (msg.includes('THREE.Clock')) return;
  // Rapier deprecated init params → внутри @react-three/rapier
  if (msg.includes('deprecated parameters for the initialization')) return;
  _warn(...args);
};

// StrictMode в dev делает двойной mount/unmount каждого компонента,
// из-за чего WebGL Canvas теряет контекст при первом unmount.
// Убираем StrictMode для стабильной работы 3D-сцены.
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
