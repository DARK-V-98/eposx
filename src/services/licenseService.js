// ============================================================
// License / access-control service (Firestore).
//
// A "store" doc represents one tenant owned by a user. Its license
// lifecycle: pending -> (admin approves) -> trial | active(lifetime)
//            trial -> expired (auto, on time) -> active (after purchase)
//            any -> locked (admin) / rejected (admin)
//
// Collection: stores/{autoId}
//   ownerUid, ownerEmail, storeName, package: 'offline'|'cloud',
//   status: 'pending'|'trial'|'active'|'locked'|'rejected',
//   trialDays: number|null, expiresAtMs: number|null (null = lifetime),
//   createdAtMs, approvedBy, approvedAtMs, note
// ============================================================
import { firestore } from '../firebase';
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc,
  query, where, orderBy,
} from 'firebase/firestore';

const STORES = 'stores';

function mapDoc(d) {
  return { id: d.id, ...d.data() };
}

// Effective status accounting for trial expiry.
export function effectiveStatus(store) {
  if (!store) return 'none';
  if (store.status === 'trial') {
    if (store.expiresAtMs && Date.now() > store.expiresAtMs) return 'expired';
    return 'trial';
  }
  if (store.status === 'active') {
    // active can also be a fixed-term purchase with an expiry
    if (store.expiresAtMs && Date.now() > store.expiresAtMs) return 'expired';
    return 'active';
  }
  return store.status || 'pending'; // pending | locked | rejected
}

export function daysLeft(store) {
  if (!store?.expiresAtMs) return null;
  return Math.max(0, Math.ceil((store.expiresAtMs - Date.now()) / 86400000));
}

// ---------------- User-facing ----------------

export async function getMyStores(uid) {
  const q = query(collection(firestore, STORES), where('ownerUid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

// The store the app should currently use (most recently usable one).
export async function getActiveStore(uid) {
  const stores = await getMyStores(uid);
  if (stores.length === 0) return null;
  const usable = stores.find((s) => ['trial', 'active'].includes(effectiveStatus(s)));
  return usable || stores[0];
}

export async function requestAccess({ uid, email, storeName, pkg }) {
  const payload = {
    ownerUid: uid,
    ownerEmail: email,
    storeName: storeName || 'My Store',
    package: pkg, // 'offline' | 'cloud'
    status: 'pending',
    trialDays: null,
    expiresAtMs: null,
    createdAtMs: Date.now(),
    approvedBy: null,
    approvedAtMs: null,
    note: '',
  };
  const ref = await addDoc(collection(firestore, STORES), payload);
  return { id: ref.id, ...payload };
}

// ---------------- Admin-facing ----------------

export async function listAllStores() {
  const q = query(collection(firestore, STORES), orderBy('createdAtMs', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
}

export async function getStore(id) {
  const d = await getDoc(doc(firestore, STORES, id));
  return d.exists() ? mapDoc(d) : null;
}

// Grant lifetime access.
export async function grantLifetime(id, approverEmail) {
  await updateDoc(doc(firestore, STORES, id), {
    status: 'active',
    trialDays: null,
    expiresAtMs: null,
    approvedBy: approverEmail,
    approvedAtMs: Date.now(),
  });
}

// Grant a trial of N days.
export async function grantTrial(id, days, approverEmail) {
  const d = Number(days) || 0;
  await updateDoc(doc(firestore, STORES, id), {
    status: 'trial',
    trialDays: d,
    expiresAtMs: Date.now() + d * 86400000,
    approvedBy: approverEmail,
    approvedAtMs: Date.now(),
  });
}

// Convert an (expired) trial into a paid fixed term, or extend.
export async function setPaidTerm(id, days, approverEmail) {
  const d = Number(days) || 0;
  await updateDoc(doc(firestore, STORES, id), {
    status: 'active',
    expiresAtMs: d > 0 ? Date.now() + d * 86400000 : null,
    approvedBy: approverEmail,
    approvedAtMs: Date.now(),
  });
}

export async function lockStore(id) {
  await updateDoc(doc(firestore, STORES, id), { status: 'locked' });
}

export async function rejectStore(id) {
  await updateDoc(doc(firestore, STORES, id), { status: 'rejected' });
}
