// ============================================================
// Installs window.api as a swappable router BEFORE any component
// module captures `const api = window.api`. This file must be the
// FIRST import in main.jsx so it runs ahead of App's component imports.
//
// - Web / mobile: no preload bridge -> default backend is the HTTP shim.
// - Electron: preload provides window.api -> we wrap it as the default
//   backend (mode 'electron'). If the contextBridge property can't be
//   reassigned, we still expose the router on window.__apiRouter.
// ============================================================
import { createHttpApi } from './httpShim';
import { createApiRouter } from './apiRouter';

const existing = typeof window !== 'undefined' ? window.api : undefined;

let defaultBackend;
if (existing && existing.products && typeof existing.products.getAll === 'function') {
  defaultBackend = { __mode: 'electron', ...existing };
} else {
  defaultBackend = createHttpApi(); // { __mode: 'http', ... }
}

const router = createApiRouter(defaultBackend);

try {
  window.api = router;
} catch (_) {
  // contextBridge may forbid reassignment in Electron; router still usable below.
}
// Stable handle the app uses to swap/reset the active backend.
window.__apiRouter = router;

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-platform', defaultBackend.__mode === 'electron' ? 'desktop' : 'web');
}

export default router;
