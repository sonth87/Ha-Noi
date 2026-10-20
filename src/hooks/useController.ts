/* Subscribe a component to a scene controller's snapshot (ADR-013). */
import { useSyncExternalStore } from 'react';

interface Store<S> {
  subscribe(fn: () => void): () => void;
  getSnapshot(): S;
}

export function useController<S>(store: Store<S>): S {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
