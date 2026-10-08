"use client";

/**
 * Current user, and logout.
 *
 * On mount it asks the backend who the caller is rather than trusting
 * localStorage. A token that has expired, or was blacklisted by a logout
 * elsewhere, looks perfectly valid locally — only the backend knows.
 *
 * The distinction matters for `loading`: during the check the UI shows a
 * skeleton rather than flashing the signed-out state and bouncing to `/login`
 * for someone who is in fact signed in. A flash-and-redirect on every refresh
 * is the most common way an auth guard gets a reputation for being broken.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthProfile, logout as apiLogout } from "@/lib/api";
import { logoutClient } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/constants";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    getAuthProfile()
      .then((res) => {
        if (!cancelled) {
          setUser(res.data.user ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Sign out.
   *
   * The backend call is best-effort: if it fails the token is still cleared
   * locally and the user still leaves the page. Failing to reach the server
   * must not trap someone in a session they asked to end.
   */
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* Blacklisting failed server-side; clearing locally regardless. */
    }

    logoutClient();

    setUser(null);

    router.push(APP_ROUTES.login);
    router.refresh();
  }, [router]);

  return { user, loading, logout };
}