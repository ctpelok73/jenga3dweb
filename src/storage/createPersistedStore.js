// src/storage/createPersistedStore.js
//
// Factory for localStorage-backed key/value stores. Replaces the load/save +
// try/catch + JSON.parse skeleton that was duplicated across the four
// *Tracker.js modules. Adds a version field so future schema changes have a
// migration hook instead of a silent shape break.
//
// Usage:
//
//   const scores = createPersistedStore({
//     key: 'jenga3d_scores',
//     version: 1,
//     defaults: () => ({ bestTurns: 0, totalGames: 0, history: [] }),
//   });
//
//   scores.load();          // → { version, ...payload }
//   scores.save(data);      // writes data
//   scores.update(d => …);  // load → mutate → save in one shot
//   scores.reset();         // remove the key

const VERSION_FIELD = '__version';

function safeRead(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Quota exceeded, private mode, etc. — swallow as before.
    return false;
  }
}

function makeDefaults(defaults) {
  return typeof defaults === 'function' ? defaults() : { ...defaults };
}

/**
 * Create a persisted store.
 *
 * @param {object} cfg
 * @param {string} cfg.key            — localStorage key
 * @param {number} [cfg.version=1]    — current schema version
 * @param {object|function} cfg.defaults — default payload (object or factory)
 * @param {function} [cfg.migrate]    — (oldData, oldVersion) => migratedData
 * @returns {{load: function, save: function, update: function, reset: function}}
 */
export function createPersistedStore({ key, version = 1, defaults, migrate }) {
  function load() {
    const raw = safeRead(key);
    if (!raw) return makeDefaults(defaults);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return makeDefaults(defaults);
    }
    if (!parsed || typeof parsed !== 'object') return makeDefaults(defaults);

    const storedVersion = parsed[VERSION_FIELD];
    if (storedVersion !== version && typeof migrate === 'function') {
      const migrated = migrate(parsed, storedVersion);
      const merged = { ...makeDefaults(defaults), ...migrated };
      // Persist migration result so we don't re-run on every load.
      save(merged);
      return merged;
    }

    // Fill in any missing keys with defaults so newly added fields don't surface as undefined.
    return { ...makeDefaults(defaults), ...parsed };
  }

  function save(data) {
    const payload = { ...data, [VERSION_FIELD]: version };
    return safeWrite(key, JSON.stringify(payload));
  }

  function update(mutator) {
    const current = load();
    const next = mutator(current);
    if (next === undefined || next === null) {
      console.warn('[createPersistedStore] mutator returned falsy — changes discarded');
      return current;
    }
    save(next);
    return next;
  }

  function reset() {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  return { load, save, update, reset };
}
