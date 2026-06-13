// ============================================================
// Firebase setup — Google authentication for E POS X.
// Note: the apiKey below is a public client identifier (safe to
// ship in the bundle); it is NOT a secret. Access is controlled
// by Firebase Auth rules + the authorized-domains list.
// ============================================================
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAILS8VAnHeG2a1dxc8TeZ2k39pYeA8p3U',
  authDomain: 'eposx-22376.firebaseapp.com',
  projectId: 'eposx-22376',
  storageBucket: 'eposx-22376.firebasestorage.app',
  messagingSenderId: '616118366148',
  appId: '1:616118366148:web:6ad2b25b9fab24f8ad3e91',
  measurementId: 'G-3C8VXEH7C7',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Keep the user signed in across reloads (web + desktop).
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Analytics only works in a real browser context (not Electron main/SSR),
// so load it lazily and ignore failures.
export async function initAnalyticsIfSupported() {
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (await isSupported()) return getAnalytics(app);
  } catch (_) {}
  return null;
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOut() {
  return fbSignOut(auth);
}

export function onAuthStateChanged(cb) {
  return fbOnAuthStateChanged(auth, cb);
}
