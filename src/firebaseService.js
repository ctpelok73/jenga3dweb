const FIREBASE_ENABLED =
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_API_KEY_HERE' &&
  import.meta.env.VITE_FIREBASE_API_KEY.length > 0;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app = null;
let auth = null;
let db = null;
let currentUser = null;
let authReady = false;
let authReadyResolve = null;
const authReadyPromise = new Promise((resolve) => { authReadyResolve = resolve; });

let _appMod = null;
let _authMod = null;
let _dbMod = null;
let _initialized = false;
let _loading = null;

async function loadModules() {
  if (_appMod && _authMod && _dbMod) return;
  if (_loading) return _loading;

  _loading = Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/database'),
  ]).then(([appMod, authMod, dbMod]) => {
    _appMod = appMod;
    _authMod = authMod;
    _dbMod = dbMod;
    _loading = null;
  });

  await _loading;
}

async function initFirebase() {
  if (!FIREBASE_ENABLED) {
    authReady = true;
    authReadyResolve(false);
    return false;
  }

  await loadModules();

  if (_appMod.getApps().length === 0) {
    app = _appMod.initializeApp(firebaseConfig);
  } else {
    app = _appMod.getApps()[0];
  }
  auth = _authMod.getAuth(app);
  db = _dbMod.getDatabase(app);

  _authMod.onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!authReady) {
      authReady = true;
      authReadyResolve(!!user);
    }
  });

  if (!auth.currentUser) {
    _authMod.signInAnonymously(auth).catch((err) => {
      console.warn('Firebase anonymous auth failed:', err.message);
      if (!authReady) {
        authReady = true;
        authReadyResolve(false);
      }
    });
  } else {
    if (!authReady) {
      authReady = true;
      authReadyResolve(true);
    }
  }

  return true;
}

async function ensureFirebase() {
  if (!_initialized) {
    _initialized = await initFirebase();
  }
  return _initialized;
}

export function isFirebaseEnabled() {
  return FIREBASE_ENABLED;
}

export async function waitForAuth() {
  await ensureFirebase();
  await authReadyPromise;
  return currentUser;
}

export function getCurrentUserId() {
  return currentUser?.uid || null;
}

export async function submitScore(dateStr, name, turns, towerHeight) {
  if (!FIREBASE_ENABLED) return null;
  const ok = await ensureFirebase();
  if (!ok || !db) return null;

  await waitForAuth();

  const entry = {
    name: name || 'Аноним',
    turns,
    towerHeight,
    timestamp: new Date().toISOString(),
    userId: currentUser?.uid || 'unknown',
  };

  const dateRef = _dbMod.ref(db, `leaderboard/${dateStr}`);
  const newRef = _dbMod.push(dateRef, entry);
  return newRef.key;
}

export async function getOnlineLeaderboard(dateStr, limit = 50) {
  if (!FIREBASE_ENABLED) return [];
  const ok = await ensureFirebase();
  if (!ok || !db) return [];

  const dateRef = _dbMod.ref(db, `leaderboard/${dateStr}`);
  const q = _dbMod.query(dateRef, _dbMod.orderByChild('turns'), _dbMod.limitToLast(limit));

  try {
    const snapshot = await _dbMod.get(q);
    if (!snapshot.exists()) return [];
    const entries = [];
    snapshot.forEach((child) => {
      entries.push({ id: child.key, ...child.val() });
    });
    return entries.reverse();
  } catch (err) {
    console.warn('Firebase leaderboard fetch failed:', err.message);
    return [];
  }
}

export function subscribeLeaderboard(dateStr, limit = 50, callback) {
  if (!FIREBASE_ENABLED) {
    callback([]);
    return () => {};
  }

  let cancelled = false;
  let firebaseUnsub = null;

  ensureFirebase().then((ok) => {
    if (cancelled || !ok || !db) {
      callback([]);
      return;
    }

    const dateRef = _dbMod.ref(db, `leaderboard/${dateStr}`);
    const q = _dbMod.query(dateRef, _dbMod.orderByChild('turns'), _dbMod.limitToLast(limit));

    _dbMod.onValue(q, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const entries = [];
      snapshot.forEach((child) => {
        entries.push({ id: child.key, ...child.val() });
      });
      callback(entries.reverse());
    }, (err) => {
      console.warn('Firebase leaderboard subscribe failed:', err.message);
      callback([]);
    });

    firebaseUnsub = () => _dbMod.off(q);
  });

  return () => {
    cancelled = true;
    if (firebaseUnsub) firebaseUnsub();
  };
}