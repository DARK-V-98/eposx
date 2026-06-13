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

## Notes
- The Firebase `apiKey` in `src/firebase.js` is a public client identifier (safe to
  ship); access is controlled by the rules above.
- **Offline package** uses the local SQLite app and does not require Firestore for
  its POS data — but still uses Firebase for login + licensing.
- Porting the full Cloud-package POS data (products, sales, etc.) into Firestore is
  the next phase; the rules already reserve `stores/{storeId}/**` for it.
