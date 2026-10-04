import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// false while server-rendering / hydrating, true afterwards. Use it to hold back UI that depends on the
// current date or the viewer's time zone, so server HTML (built days ago, in UTC) never mismatches the client.
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
