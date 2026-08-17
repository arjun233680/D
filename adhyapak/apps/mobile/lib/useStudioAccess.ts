import { useCallback, useEffect, useState } from 'react';
import { isStaff, onAuthStateChange, resolveStudioAccess, type StudioAccess } from '@adhyapak/core';

/**
 * Whether this device may use the Studio, and if not, which of the three
 * reasons applies.
 *
 * Deliberately the same shape as the website's hook. The mobile Studio had no
 * check of any kind: the upload form rendered for anybody who reached the
 * screen. The database would have refused the write — `commit_import_batch`
 * raises for a non-staff caller and RLS covers the rest — but refusing at the
 * end of a filled-in form is not the same as saying so at the start.
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
