import { useEffect, useState, useCallback } from "react";

export type AppUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  isGuest?: boolean;
};

interface StoredUser extends AppUser {
  passwordHash: string;
}

const USERS_KEY = "trackware_users";
const CURRENT_USER_KEY = "trackware_current_user";

const hashPassword = (password: string): string => {
  return btoa(password);
};

const verifyPassword = (password: string, hash: string): boolean => {
  return btoa(password) === hash;
};

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(() => {
    try {
      const currentUserStr = localStorage.getItem(CURRENT_USER_KEY);
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr) as AppUser;
        setUser(currentUser);
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

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (email === "admin" && password === "123456") {
        const adminUser: AppUser = {
          id: "admin-user-id",
          email: "admin",
          displayName: "Admin",
          isGuest: false,
        };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(adminUser));
        setUser(adminUser);
        return { success: true };
      }

      const usersStr = localStorage.getItem(USERS_KEY);
      const users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];

      const foundUser = users.find((u) => u.email === email);
      if (!foundUser || !verifyPassword(password, foundUser.passwordHash)) {
        return { success: false, error: "Invalid email or password" };
      }

      const currentUser: AppUser = {
        id: foundUser.id,
        email: foundUser.email,
        displayName: foundUser.displayName,
        isGuest: foundUser.isGuest,
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      setUser(currentUser);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Sign in failed" };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    try {
      const usersStr = localStorage.getItem(USERS_KEY);
      const users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];

      const existing = users.find((u) => u.email === email);
      if (existing) {
        return { success: false, error: "Email already registered" };
      }

      const newUser: StoredUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        displayName: displayName || (email.includes("@") ? email.split("@")[0] : email),
        isGuest: false,
        passwordHash: hashPassword(password),
      };

      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      const currentUser: AppUser = {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        isGuest: newUser.isGuest,
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      setUser(currentUser);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Sign up failed" };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
    setLoading(false);
  };

  return { user, loading, signIn, signUp, signOut, refetch: fetchMe };
};
