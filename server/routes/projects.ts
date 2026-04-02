import { Router } from "express";
import { db } from "../db";
import { projects } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function formatProject(p: any) {
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    description: p.description,
    github_url: p.githubUrl,
    budget: p.budget ? Number(p.budget) : undefined,
    schedule_weeks: p.scheduleWeeks ? Number(p.scheduleWeeks) : undefined,
    current_week: p.currentWeek ? Number(p.currentWeek) : undefined,
    team_members: p.teamMembers ? JSON.parse(p.teamMembers) : [],
    team_count: p.teamCount ? Number(p.teamCount) : undefined,
    created_at: p.createdAt,
  };
}

router.get("/", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const userId = req.session?.userId;
    
    // If no user session, return empty array instead of error
    if (!userId) {
      return res.json([]);
    }
    
    // Show all projects for the user (includes guest-created projects)
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));

    return res.json(userProjects.map(formatProject));
  } catch (err) {
    console.error("Get projects error:", err);
    return res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const userId = req.session?.userId;
  console.log("[v0] Create project - session:", { userId, sessionId: req.sessionID, hasSession: !!req.session });
  if (!userId) {
    console.log("[v0] Create project failed - no userId in session");
    return res.status(401).json({ error: "No session" });
  }

  const { type, name, description, github_url, budget, schedule_weeks, current_week, team_members, team_count } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Project name is required" });
  }

  try {
    const [project] = await db.insert(projects).values({
      userId,
      type: type || "manual",
      name,
      description,
      githubUrl: github_url,
      budget: budget !== undefined ? String(budget) : null,
      scheduleWeeks: schedule_weeks !== undefined ? String(schedule_weeks) : null,
      currentWeek: current_week !== undefined ? String(current_week) : null,
      teamMembers: team_members ? JSON.stringify(team_members) : null,
      teamCount: team_count !== undefined ? String(team_count) : null,
    }).returning();

    return res.json(formatProject(project));
  } catch (err) {
    console.error("Create project error:", err);
    return res.status(500).json({ error: "Failed to create project" });
  }
});

router.delete("/:id", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const userId = req.session?.userId;
  const { id } = req.params;

  try {
    let deleted;
    if (userId) {
      // Users can only delete their own projects
      deleted = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .returning();
    } else {
      return res.status(401).json({ error: "No session" });
    }

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Delete project error:", err);
    return res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
