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
      console.log("[v0] Fetching auth user...");
      const res = await fetch("/api/auth/me", { credentials: "include" });
      console.log("[v0] Auth response status:", res.status);
      if (res.ok) {
        const { user } = await res.json();
        console.log("[v0] Auth user:", user);
        setUser(user);
      } else {
        console.log("[v0] Auth failed, setting user to null");
        setUser(null);
      }
    } catch (err) {
      console.error("[v0] Auth error:", err);
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
