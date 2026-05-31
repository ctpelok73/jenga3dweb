const PURCHASE_KEY = 'jenga3d_purchases';
const UNLOCK_CODES_KEY = 'jenga3d_unlock_codes';
const PURCHASE_VERIFICATION_URL = import.meta.env.VITE_PURCHASE_VERIFICATION_URL || '';

const PREMIUM_ITEMS = [
  {
    id: 'skin_pack_all',
    title: '🎨 Все скины блоков',
    description: 'Неон, Мрамор, Лёд, Бамбук, Конфеты — навсегда',
    price: '$1.99',
    category: 'skins',
    paymentUrl: import.meta.env.VITE_PAYMENT_SKIN_PACK || '',
  },
  {
    id: 'remove_ads',
    title: '🚫 Убрать рекламу',
    description: 'Никаких баннеров и видео — чистая игра',
    price: '$2.99',
    category: 'ad_free',
    paymentUrl: import.meta.env.VITE_PAYMENT_REMOVE_ADS || '',
  },
  {
    id: 'env_themes_all',
    title: '🌍 Все темы окружения',
    description: 'Космос, Пляж, Библиотека — навсегда',
    price: '$1.99',
    category: 'env',
    paymentUrl: import.meta.env.VITE_PAYMENT_ENV_THEMES || '',
  },
];

const VALID_CODES = {};
// Production: populate VALID_CODES from remote API or server config
// Keys are normalized uppercase codes, values are { items: ['skin_pack_all', ...] }

export const PURCHASE_STATUS = {
  AVAILABLE: 'available',
  DISABLED: 'disabled',
  PURCHASED: 'purchased',
  REQUIRES_SERVER_VERIFICATION: 'requiresServerVerification',
};

function loadPurchases() {
  try {
    const raw = localStorage.getItem(PURCHASE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePurchases(purchases) {
  try {
    localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchases));
  } catch {}
}

function loadUsedCodes() {
  try {
    const raw = localStorage.getItem(UNLOCK_CODES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveUsedCodes(codes) {
  try {
    localStorage.setItem(UNLOCK_CODES_KEY, JSON.stringify(codes));
  } catch {}
}

export function getPremiumItems() {
  return PREMIUM_ITEMS.map((item) => ({
    ...item,
    status: getItemStatus(item),
  }));
}

export function isPremiumStoreAvailable() {
  return PREMIUM_ITEMS.some((item) => Boolean(item.paymentUrl));
}

export function getItemStatus(itemOrId) {
  const item = typeof itemOrId === 'string'
    ? PREMIUM_ITEMS.find((premiumItem) => premiumItem.id === itemOrId)
    : itemOrId;

  if (!item) return PURCHASE_STATUS.DISABLED;
  if (isPurchased(item.id)) return PURCHASE_STATUS.PURCHASED;
  if (!item.paymentUrl) return PURCHASE_STATUS.DISABLED;
  if (!PURCHASE_VERIFICATION_URL) return PURCHASE_STATUS.REQUIRES_SERVER_VERIFICATION;
  return PURCHASE_STATUS.AVAILABLE;
}

export function isPurchased(itemId) {
  const purchases = loadPurchases();
  return purchases[itemId]?.purchased || false;
}

export function isSkinPackPurchased() {
  return isPurchased('skin_pack_all');
}

export function isRemoveAdsPurchased() {
  const purchased = isPurchased('remove_ads');
  if (purchased) {
    try {
      const adFree = localStorage.getItem('jenga3d_ad_free');
      if (adFree !== '1') localStorage.setItem('jenga3d_ad_free', '1');
    } catch {}
  }
  return purchased;
}

export function isEnvThemesPurchased() {
  return isPurchased('env_themes_all');
}

export function getAvailableSkins() {
  const base = ['classic'];
  if (isSkinPackPurchased()) {
    return ['classic', 'neon', 'marble', 'ice', 'bamboo', 'candy'];
  }
  return base;
}

export function getAvailableEnvThemes() {
  const base = ['classic'];
  if (isEnvThemesPurchased()) {
    return ['classic', 'space', 'beach', 'library'];
  }
  return base;
}

export function purchaseItem(itemId, { verified = false } = {}) {
  if (!verified) {
    return false;
  }

  const purchases = loadPurchases();
  purchases[itemId] = {
    purchased: true,
    purchasedAt: new Date().toISOString(),
  };
  savePurchases(purchases);

  if (itemId === 'remove_ads') {
    localStorage.setItem('jenga3d_ad_free', '1');
  }

  return true;
}

export function redeemCode(code) {
  if (!code || code.length < 6) return { success: false, error: 'Код слишком короткий' };

  const normalized = code.trim().toUpperCase();
  const usedCodes = loadUsedCodes();

  if (usedCodes.includes(normalized)) {
    return { success: false, error: 'Код уже использован' };
  }

  const entry = VALID_CODES[normalized];
  if (!entry) {
    return { success: false, error: 'Неверный код' };
  }

  for (const itemId of entry.items) {
    purchaseItem(itemId, { verified: true });
  }
  usedCodes.push(normalized);
  saveUsedCodes(usedCodes);

  return { success: true, items: entry.items };
}

export function getPurchaseStatus() {
  const purchases = loadPurchases();
  return PREMIUM_ITEMS.map((item) => ({
    ...item,
    status: getItemStatus(item),
    purchased: purchases[item.id]?.purchased || false,
    purchasedAt: purchases[item.id]?.purchasedAt,
  }));
}

export function resetPurchases() {
  localStorage.removeItem(PURCHASE_KEY);
  localStorage.removeItem(UNLOCK_CODES_KEY);
  localStorage.removeItem('jenga3d_ad_free');
}
