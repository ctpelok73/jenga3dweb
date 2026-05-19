import React, { Suspense, lazy } from 'react';

const GameScene = lazy(() => import('./GameScene'));

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Suspense
        fallback={
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              background: '#10131a',
              color: '#fff',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            Загрузка 3D-сцены...
          </div>
        }
      >
        <GameScene />
      </Suspense>
    </div>
  );
}

export default App;