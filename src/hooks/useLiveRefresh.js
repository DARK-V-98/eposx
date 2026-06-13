import { useEffect, useRef } from 'react';
import { REALTIME_EVENT } from '../api/realtime';

// Calls `reloadFn` whenever Cloud-store data changes (debounced to coalesce
// bursts). No-op for offline/web-SQLite stores, where the event never fires.
//
// Usage:  useLiveRefresh(loadData);
//   or:   useLiveRefresh(loadData, ['products', 'sales']); // only these collections
export default function useLiveRefresh(reloadFn, collections = null) {
  const fnRef = useRef(reloadFn);
  fnRef.current = reloadFn;

  useEffect(() => {
    let timer = null;
    const handler = (e) => {
      const changed = e?.detail?.collection;
      if (collections && changed && !collections.includes(changed)) return;
      clearTimeout(timer);
      timer = setTimeout(() => { try { fnRef.current?.(); } catch (_) {} }, 150);
    };
    window.addEventListener(REALTIME_EVENT, handler);
    return () => { clearTimeout(timer); window.removeEventListener(REALTIME_EVENT, handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(collections) ? collections.join(',') : collections]);
}
