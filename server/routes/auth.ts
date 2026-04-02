import { Router } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

declare module "express-session" {
  interface SessionData {
    userId: string;
    userEmail: string;
    displayName?: string;
    isAuthenticated?: boolean;
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuf = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), hashBuf);
}

router.post("/signup", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = hashPassword(password);
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      displayName: displayName || (email.includes("@") ? email.split("@")[0] : email),
    }).returning();

    req.session.userId = user.id;
    req.session.userEmail = user.email!;
    req.session.displayName = user.displayName || undefined;
    req.session.isAuthenticated = true;

    // Explicitly save the session
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/signin", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Hardcoded admin user - always works without database lookup
    if (email === "admin" && password === "123456") {
      // Check if admin exists in DB, if not create them
      let [adminUser] = await db.select().from(users).where(eq(users.email, "admin"));
      if (!adminUser) {
        const passwordHash = hashPassword("123456");
        [adminUser] = await db.insert(users).values({
          email: "admin",
          passwordHash,
          displayName: "Admin",
        }).returning();
      }

      req.session.userId = adminUser.id;
      req.session.userEmail = adminUser.email!;
      req.session.displayName = adminUser.displayName || "Admin";
      req.session.isAuthenticated = true;

      // Explicitly save the session
      await new Promise<void>((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
      );

      return res.json({
        user: {
          id: adminUser.id,
          email: adminUser.email,
          displayName: adminUser.displayName || "Admin",
        },
      });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email!;
    req.session.displayName = user.displayName || undefined;
    req.session.isAuthenticated = true;

    // Explicitly save the session
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (err: any) {
    console.error("Signin error:", err);
    return res.status(500).json({ error: "Sign in failed" });
  }
});

router.post("/signout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (!req.session.userId) {
    return res.status(401).json({ error: "No session" });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    return res.json({
      user: {
        id: user.id,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        isGuest: !user.email,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
