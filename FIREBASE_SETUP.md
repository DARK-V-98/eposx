# Firebase Setup — E POS X (Cloud package, licensing & images)

The app uses Firebase for **Google login**, **licensing/access control (Firestore)**,
and **product images (Storage)**. Do these one-time steps in the
[Firebase Console](https://console.firebase.google.com/) for project **eposx-22376**.

## 1. Authentication
- **Authentication → Sign-in method → Google → Enable** → Save.
- **Authentication → Settings → Authorized domains**: keep `localhost`; add your
  deployed web domain when you host it.

## 2. Firestore
- **Firestore Database → Create database** (Production mode, pick a region).
- **Rules** tab → paste the contents of [`firestore.rules`](firestore.rules) → **Publish**.

## 3. Storage
- **Storage → Get started** (accept default bucket).
- **Rules** tab → paste the contents of [`storage.rules`](storage.rules) → **Publish**.

## 4. Admin account
The platform admin is hard-coded as **esystemlk@gmail.com** (in both
[`src/auth/roles.js`](src/auth/roles.js) `PLATFORM_ADMINS` and the security rules).
Sign in with that Google account to see the **Admin — Access** page. To change or
add admins, update **both** places.

## How the access flow works
1. A new user signs in with Google → sees **two packages** (Offline / Cloud) →
   enters a store name → **Request Access** (creates a `stores` doc, status `pending`).
2. Admin opens **Admin — Access**, finds the pending request, and grants:
   - **Lifetime** (never expires), or
   - **Trial** of N days (auto-locks after expiry), or
   - **Paid fixed term** of N days.
3. The user re-enters automatically. Trial users see a countdown banner.
4. On trial expiry the store flips to **expired** → user is locked out and shown a
   **Purchase E POS X** screen until the admin activates a paid term.

## Data backends
- **Offline package** → local SQLite (Electron) / the bundled HTTP server. No POS
  data in Firestore; still uses Firebase for login + licensing.
- **Cloud package** → all POS data lives in Firestore under
  `stores/{storeId}/<collection>` (`products`, `sales`, `customers`, `categories`,
  `services`, `appointments`, `quotations`, `returns`, `expenses`, `coupons`,
  `payments`, `cash_sessions`), plus `meta/settings` and `meta/counters`
  (sequential invoice numbers). Product images go to Firebase **Storage**.
- Switching is automatic: on login the app reads the store's `package` and points
  `window.api` at the Firestore backend (cloud) or the SQLite backend (offline) —
  the same React components work against either, unchanged.

## Notes
- The Firebase `apiKey` in `src/firebase.js` is a public client identifier (safe to
  ship); access is controlled by the rules above.
- Cloud data sync is real-time-capable and multi-device; the Firestore security
  rules restrict each store's data to its owner (and the platform admin).
- The Cloud package runs on **web + mobile**. On packaged desktop Electron the
  data backend stays local (offline package), since the renderer's `window.api`
  bridge can't be swapped at runtime.
