// ============================================================
// Realtime sync for Cloud stores.
//
// Subscribes to each store collection with onSnapshot, keeps a live
// in-memory cache, and emits a window event whenever data changes so
// components can refresh. The Firestore backend reads getAll() straight
// from this cache, so realtime adds NO extra document reads.
// ============================================================
import { firestore } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const COLLECTIONS = [
  'products', 'services', 'customers', 'categories', 'sales', 'appointments',
  'quotations', 'returns', 'expenses', 'coupons', 'payments', 'cash_sessions',
];

const EVENT = 'eposx:data';

let activeStoreId = null;
let unsubs = [];
const cache = new Map(); // collectionName -> array of {id, ...}

function emit(collectionName) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { collection: collectionName, storeId: activeStoreId } }));
}

export function startRealtime(storeId) {
  if (activeStoreId === storeId && unsubs.length) return; // already running
  stopRealtime();
  activeStoreId = storeId;

  for (const name of COLLECTIONS) {
    const unsub = onSnapshot(
      collection(firestore, 'stores', storeId, name),
      (snap) => {
        cache.set(name, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        emit(name);
      },
      (err) => console.error(`[realtime] ${name} listener error:`, err)
    );
    unsubs.push(unsub);
  }
}

export function stopRealtime() {
  unsubs.forEach((u) => { try { u(); } catch (_) {} });
  unsubs = [];
  cache.clear();
  activeStoreId = null;
}

// Returns the cached array for a collection, or null if not yet populated.
export function getCache(collectionName) {
  return cache.has(collectionName) ? cache.get(collectionName) : null;
}

export function isRealtimeActive() {
  return unsubs.length > 0;
}

export const REALTIME_EVENT = EVENT;
