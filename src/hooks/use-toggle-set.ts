import { useCallback, useState } from 'react';

export function useToggleSet<T>(initial: Set<T>) {
  const [set, setSet] = useState(initial);

  const toggle = useCallback((key: T) => {
    setSet((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return [set, toggle] as const;
}
