import React, { useState } from 'react';
import { getPremiumItems, isPurchased, redeemCode } from './purchaseService';

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
    <div className="j-overlay" role="dialog" aria-label="Премиум магазин">
      <div className="j-card j-card--wide">
        <h2 className="j-heading j-heading--sm">💎 Премиум</h2>

        <div className="j-purchase-grid">
          {items.map((item) => {
            const purchased = isPurchased(item.id);
            return (
              <div key={item.id} className={`j-purchase-item ${purchased ? 'j-purchase-item--purchased' : 'j-purchase-item--available'}`}>
                <div className="j-purchase-item__info">
                  <div className="j-purchase-item__title">{item.title}</div>
                  <div className="j-purchase-item__desc">{item.description}</div>
                </div>
                {purchased ? (
                  <span className="j-purchase-item__status">✅ Куплено</span>
                ) : (
                  <button className="j-btn j-btn--primary j-purchase-item__buy" onClick={() => handleBuy(item)}>
                    {item.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="j-lb-section">
          <div className="j-activate-title">🔑 Активировать код</div>
          <div className="j-activate-hint">
            Если вы получили код после покупки — введите его здесь
          </div>
          <div className="j-activate-row">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="XXXX-XXXX"
              maxLength={20}
              className="j-name-field j-name-field--code"
              aria-label="Код активации"
            />
            <button className="j-btn j-btn--primary j-purchase-item__buy" onClick={handleRedeemCode}>
              Активировать
            </button>
          </div>
          {codeResult?.success && (
            <div className="j-activate-success">
              ✅ Код активирован! Разблокировано: {codeResult.items.join(', ')}
            </div>
          )}
          {codeResult && !codeResult.success && (
            <div className="j-reward-error">
              ❌ {codeResult.error}
            </div>
          )}
        </div>

        <div className="j-flex-center">
          <button className="j-btn j-btn--secondary" onClick={onClose}>
            ✕ Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}