import { useState, useEffect, useCallback } from "react";

export interface TeamMember {
  name: string;
  role: string;
}

export interface Project {
  id: string;
  type: "github" | "manual";
  name: string;
  description?: string;
  github_url?: string;
  budget?: number;
  schedule_weeks?: number;
  current_week?: number;
  team_count?: number;
  team_members?: TeamMember[];
  created_at: string;
  user_id?: string;
}

export const useProjects = (userId?: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, userId]);

  const createProject = async (projectData: Omit<Project, "id" | "created_at">): Promise<Project | null> => {
    try {
      console.log("[v0] Creating project with data:", projectData);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(projectData),
      });

      console.log("[v0] Create project response status:", res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.log("[v0] Create project error response:", errorText);
        return null;
      }

      const newProject = await res.json();
      console.log("[v0] Project created successfully:", newProject);
      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      console.log("[v0] Create project exception:", err);
      return null;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        return false;
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      return true;
    } catch {
      return false;
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project | null> => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        return null;
      }

      const updated = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      return updated;
    } catch {
      return null;
    }
  };

  return {
    projects,
    loading,
    createProject,
    deleteProject,
    updateProject,
    refetch: fetchProjects,
  };
};
