import { useEffect, useState, useCallback } from "react";

export type AppUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  isGuest?: boolean;
};

const STORAGE_KEY = "trackware_user";
const USERS_KEY = "trackware_users";

// Simple user store in localStorage
const getUsers = (): Record<string, { password: string; displayName: string }> => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveUsers = (users: Record<string, { password: string; displayName: string }>) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
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

  const signIn = (email: string, password: string): { success: boolean; error?: string } => {
    // Hardcoded admin user - always works
    if (email === "admin" && password === "123456") {
      const adminUser: AppUser = {
        id: "admin-user-id",
        email: "admin",
        displayName: "Admin",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
      setUser(adminUser);
      return { success: true };
    }

    // Check stored users
    const users = getUsers();
    const storedUser = users[email];
    
    if (!storedUser || storedUser.password !== password) {
      return { success: false, error: "Invalid email or password" };
    }

    const appUser: AppUser = {
      id: `user-${email}`,
      email,
      displayName: storedUser.displayName || email,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
    setUser(appUser);
    return { success: true };
  };

  const signUp = (email: string, password: string, displayName?: string): { success: boolean; error?: string } => {
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    const users = getUsers();
    
    if (users[email]) {
      return { success: false, error: "User already exists" };
    }

    // Save new user
    users[email] = {
      password,
      displayName: displayName || (email.includes("@") ? email.split("@")[0] : email),
    };
    saveUsers(users);

    // Auto sign in
    const appUser: AppUser = {
      id: `user-${email}`,
      email,
      displayName: displayName || (email.includes("@") ? email.split("@")[0] : email),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
    setUser(appUser);
    return { success: true };
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setLoading(false);
  };

  return { user, loading, signIn, signUp, signOut, refetch: fetchMe };
};
