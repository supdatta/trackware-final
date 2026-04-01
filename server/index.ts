import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import { users } from "../shared/schema";
import authRouter from "./routes/auth";
import projectsRouter from "./routes/projects";
import githubRouter from "./routes/github";
import geminiRouter from "./routes/gemini";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isDev = process.env.NODE_ENV !== "production";
const PORT = isDev ? 5001 : 5000;

const PgSession = connectPgSimple(session);

app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "trackware-dev-secret-change-in-prod",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? "lax" : "strict",
  },
}));

// Auto-create a guest user for every new session — no signup required
app.use(async (req, _res, next) => {
  if (!req.session.userId) {
    try {
      const [guestUser] = await db
        .insert(users)
        .values({ displayName: "Guest" })
        .returning();
      req.session.userId = guestUser.id;
      req.session.displayName = "Guest";
      await new Promise<void>((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
      );
    } catch (err) {
      console.error("Failed to create guest session:", err);
    }
  }
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/github", githubRouter);
app.use("/api/gemini", geminiRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

if (!isDev) {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
