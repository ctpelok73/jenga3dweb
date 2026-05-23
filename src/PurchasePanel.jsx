import React, { useState } from 'react';
import { getPremiumItems, isPurchased, redeemCode } from './purchaseService';

const styles = {
  container: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto', zIndex: 20,
  },
  card: {
    background: 'rgba(0, 0, 0, 0.85)', color: '#fff',
    padding: '28px 36px', borderRadius: 16,
    backdropFilter: 'blur(12px)', textAlign: 'center',
    maxWidth: 420, width: '90%',
    border: '1px solid rgba(42,110,255,0.15)',
  },
  heading: { margin: '0 0 12px', fontSize: 22, fontWeight: 'bold' },
  itemGrid: {
    display: 'grid', gridTemplateColumns: '1fr',
    gap: 10, marginBottom: 20,
  },
  itemCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
  },
  itemCardPurchased: {
    background: 'rgba(68,255,136,0.08)',
    border: '1px solid rgba(68,255,136,0.2)',
  },
  itemInfo: { flex: 1, textAlign: 'left' },
  itemTitle: { fontSize: 14, fontWeight: 'bold' },
  itemDesc: { fontSize: 12, color: '#aaa', marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#2a6eff', minWidth: 60, textAlign: 'right' },
  purchasedBadge: {
    fontSize: 13, fontWeight: 'bold', color: '#44ff88',
  },
  buyBtn: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#2a6eff', color: '#fff', fontSize: 13,
    cursor: 'pointer', fontWeight: 'bold',
  },
  codeSection: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: 16, marginBottom: 16,
  },
  codeTitle: { fontSize: 14, fontWeight: 'bold', color: '#ffcc00', marginBottom: 8 },
  codeDesc: { fontSize: 12, color: '#888', marginBottom: 10 },
  codeInputRow: { display: 'flex', gap: 8 },
  codeField: {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: '#fff',
    fontSize: 14, width: '100%', outline: 'none',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  codeBtn: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#ffcc00', color: '#000', fontSize: 13,
    cursor: 'pointer', fontWeight: 'bold',
  },
  successMsg: { fontSize: 13, color: '#44ff88', marginTop: 8 },
  errorMsg: { fontSize: 13, color: '#ff4444', marginTop: 8 },
  buttonGroup: { display: 'flex', gap: 10, justifyContent: 'center' },
  btnSecondary: {
    padding: '10px 20px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent', color: '#fff', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold',
  },
};

export default function PurchasePanel({ onClose, onPurchaseChange }) {
  const items = getPremiumItems();
  const [codeInput, setCodeInput] = useState('');
  const [codeResult, setCodeResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBuy = (item) => {
    if (item.paymentUrl) {
      window.open(item.paymentUrl, '_blank', 'noopener');
    } else {
      redeemCode('DEMO-' + item.id.toUpperCase().replace(/_/g, ''));
      setRefreshKey((k) => k + 1);
      if (onPurchaseChange) onPurchaseChange();
    }
  };

  const handleRedeemCode = () => {
    const result = redeemCode(codeInput);
    setCodeResult(result);
    if (result.success) {
      setCodeInput('');
      setRefreshKey((k) => k + 1);
      if (onPurchaseChange) onPurchaseChange();
    }
  };

  return (
    <div style={styles.container} role="dialog" aria-label="Премиум магазин">
      <div style={styles.card}>
        <h2 style={styles.heading}>💎 Премиум</h2>

        <div style={styles.itemGrid}>
          {items.map((item) => {
            const purchased = isPurchased(item.id);
            return (
              <div key={item.id} style={{
                ...styles.itemCard,
                ...(purchased ? styles.itemCardPurchased : {}),
              }}>
                <div style={styles.itemInfo}>
                  <div style={styles.itemTitle}>{item.title}</div>
                  <div style={styles.itemDesc}>{item.description}</div>
                </div>
                {purchased ? (
                  <span style={styles.purchasedBadge}>✅ Куплено</span>
                ) : (
                  <button style={styles.buyBtn} onClick={() => handleBuy(item)}>
                    {item.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={styles.codeSection}>
          <div style={styles.codeTitle}>🔑 Активировать код</div>
          <div style={styles.codeDesc}>
            Если вы получили код после покупки — введите его здесь
          </div>
          <div style={styles.codeInputRow}>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="XXXX-XXXX"
              maxLength={20}
              style={styles.codeField}
              aria-label="Код активации"
            />
            <button style={styles.codeBtn} onClick={handleRedeemCode}>
              Активировать
            </button>
          </div>
          {codeResult?.success && (
            <div style={styles.successMsg}>
              ✅ Код активирован! Разблокировано: {codeResult.items.join(', ')}
            </div>
          )}
          {codeResult && !codeResult.success && (
            <div style={styles.errorMsg}>
              ❌ {codeResult.error}
            </div>
          )}
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.btnSecondary} onClick={onClose}>
            ✕ Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}