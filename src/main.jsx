import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { createHttpApi } from './api/httpShim';

// In Electron, preload.js provides window.api (IPC -> local SQLite).
// In the browser / Capacitor app there is no preload, so we install an
// HTTP-backed shim that talks to the REST server. Components are unchanged.
if (!window.api) {
  window.api = createHttpApi();
  document.documentElement.setAttribute('data-platform', 'web');
} else {
  document.documentElement.setAttribute('data-platform', 'desktop');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
