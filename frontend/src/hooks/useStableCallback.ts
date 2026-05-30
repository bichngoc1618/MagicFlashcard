import { useCallback, useRef, useEffect } from 'react';

/**
 * A hook that returns a stable callback function which always has access to
 * the latest state/props, without ever changing its reference.
 * 
 * This is highly useful for optimizing child components (with React.memo)
 * to avoid unnecessary re-renders when a callback dependency changes.
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(((...args) => {
    return callbackRef.current(...args);
  }) as T, []);
}
