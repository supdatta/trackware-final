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
  try {
    const userId = req.session?.userId;
    const isAuthenticated = req.session?.isAuthenticated;
    
    // For authenticated users, only show their projects
    // For guests (demo mode), show all projects so they can see what they created
    let userProjects;
    if (isAuthenticated && userId) {
      userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt));
    } else {
      // Guest mode: show all projects (demo-friendly)
      userProjects = await db
        .select()
        .from(projects)
        .orderBy(desc(projects.createdAt));
    }

    res.json(userProjects.map(formatProject));
  } catch (err) {
    console.error("Get projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: "No session" });

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

    res.json(formatProject(project));
  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = req.session?.userId;
  const isAuthenticated = req.session?.isAuthenticated;
  const { id } = req.params;

  try {
    let deleted;
    if (isAuthenticated && userId) {
      // Authenticated users can only delete their own projects
      deleted = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .returning();
    } else {
      // Guest mode: allow deleting any project (demo-friendly)
      deleted = await db
        .delete(projects)
        .where(eq(projects.id, id))
        .returning();
    }

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
