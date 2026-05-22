import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, push, query, orderByChild, limitToLast, get, onValue, off } from 'firebase/database';

const FIREBASE_ENABLED =
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_API_KEY_HERE';

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

function initFirebase() {
  if (!FIREBASE_ENABLED) {
    authReady = true;
    authReadyResolve(false);
    return false;
  }
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getDatabase(app);

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    authReady = true;
    authReadyResolve(true);
  });

  signInAnonymously(auth).catch((err) => {
    console.warn('Firebase anonymous auth failed:', err.message);
    authReady = true;
    authReadyResolve(false);
  });

  return true;
}

const initialized = initFirebase();

export function isFirebaseEnabled() {
  return FIREBASE_ENABLED && initialized;
}

export async function waitForAuth() {
  await authReadyPromise;
  return currentUser;
}

export function getCurrentUserId() {
  return currentUser?.uid || null;
}

export async function submitScore(dateStr, name, turns, towerHeight) {
  if (!isFirebaseEnabled() || !db) return null;

  await waitForAuth();

  const entry = {
    name: name || 'Аноним',
    turns,
    towerHeight,
    timestamp: new Date().toISOString(),
    userId: currentUser?.uid || 'unknown',
  };

  const dateRef = ref(db, `leaderboard/${dateStr}`);
  const newRef = push(dateRef, entry);
  return newRef.key;
}

export async function getOnlineLeaderboard(dateStr, limit = 50) {
  if (!isFirebaseEnabled() || !db) return [];

  const dateRef = ref(db, `leaderboard/${dateStr}`);
  const q = query(dateRef, orderByChild('turns'), limitToLast(limit));

  try {
    const snapshot = await get(q);
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
  if (!isFirebaseEnabled() || !db) {
    callback([]);
    return () => {};
  }

  const dateRef = ref(db, `leaderboard/${dateStr}`);
  const q = query(dateRef, orderByChild('turns'), limitToLast(limit));

  onValue(q, (snapshot) => {
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

  return () => off(q);
}