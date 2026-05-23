export const baseStyles = {
  overlay: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    pointerEvents: 'none', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", zIndex: 10,
  },
  panel: {
    position: 'absolute', top: 12, left: 12,
    background: 'rgba(0, 0, 0, 0.75)', color: '#fff',
    padding: '12px 16px', borderRadius: 12,
    backdropFilter: 'blur(8px)', textAlign: 'left', pointerEvents: 'auto',
    minWidth: 160, border: '1px solid rgba(255,255,255,0.08)',
  },
  title: { margin: '0 0 8px', fontSize: 20, fontWeight: 'bold' },
  info: { fontSize: 14, marginBottom: 10, lineHeight: 1.6 },
  message: { color: '#ffcc00', marginBottom: 4, fontSize: 14 },
  buttons: { display: 'flex', gap: 8, justifyContent: 'flex-start' },
  btn: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#2a6eff', color: '#fff', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s',
  },
  btnSecondary: {
    padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent', color: '#fff', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold',
  },
};

export const screenStyles = {
  container: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto', zIndex: 20,
  },
  card: {
    background: 'rgba(0, 0, 0, 0.85)', color: '#fff',
    padding: '32px 40px', borderRadius: 16,
    backdropFilter: 'blur(12px)', textAlign: 'center',
    maxWidth: 380, border: '1px solid rgba(255,255,255,0.1)',
  },
  heading: { margin: '0 0 12px', fontSize: 28, fontWeight: 'bold' },
  subtext: { fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 1.5 },
  statRow: { display: 'flex', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { textAlign: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2a6eff' },
  statLabel: { fontSize: 12, color: '#888' },
};

export const PLAYER_COLORS = ['#2a6eff', '#ff4444', '#aa44ff'];
export const PLAYER_NAMES = ['Игрок 1', 'Игрок 2', '🤖 ИИ'];