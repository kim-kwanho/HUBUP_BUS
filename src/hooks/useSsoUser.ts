import { useEffect, useState } from 'react';

export function useSsoUser() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!cancelled) setUserId(data.userId ?? null);
      } catch {
        if (!cancelled) setUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { userId, isLoading: userId === undefined };
}
