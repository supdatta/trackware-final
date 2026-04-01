import { useEffect, useState, useCallback } from "react";

export type AppUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  isGuest?: boolean;
};

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const { user } = await res.json();
        setUser(user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return { user, loading, signOut, refetch: fetchMe };
};
