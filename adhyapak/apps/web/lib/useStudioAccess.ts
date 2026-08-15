'use client';

import { useCallback, useEffect, useState } from 'react';
import { isStaff, onAuthStateChange, resolveStudioAccess, type StudioAccess } from '@adhyapak/core';

/**
 * Whether this browser may use the Studio, and if not, which of the three
 * reasons applies.
 *
 * Re-resolves on every auth change, so signing in on the sign-in page updates
 * the import wizard in another tab without a reload.
 */
export function useStudioAccess(): {
  access: StudioAccess | undefined;
  loading: boolean;
  refresh: () => void;
} {
  const [access, setAccess] = useState<StudioAccess | undefined>();
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setLoading(true);

    const apply = () => {
      void resolveStudioAccess(isStaff).then((next) => {
        if (!live) return;
        setAccess(next);
        setLoading(false);
      });
    };

    apply();
    const unsubscribe = onAuthStateChange(apply);
    return () => {
      live = false;
      unsubscribe();
    };
  }, [nonce]);

  return { access, loading, refresh };
}
