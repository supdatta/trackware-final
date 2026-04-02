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

const PROJECTS_KEY = "trackware_projects";
const CURRENT_USER_KEY = "trackware_current_user";

export const useProjects = (userId?: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    try {
      const currentUserStr = localStorage.getItem(CURRENT_USER_KEY);
      if (!currentUserStr) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const currentUser = JSON.parse(currentUserStr);
      const currentUserId = currentUser.id;

      const projectsStr = localStorage.getItem(PROJECTS_KEY);
      const allProjects: Project[] = projectsStr ? JSON.parse(projectsStr) : [];

      const userProjects = allProjects.filter((p) => p.user_id === currentUserId);
      userProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setProjects(userProjects);
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
      const currentUserStr = localStorage.getItem(CURRENT_USER_KEY);
      if (!currentUserStr) {
        console.log("[localStorage] Create project failed - no current user");
        return null;
      }

      const currentUser = JSON.parse(currentUserStr);
      const currentUserId = currentUser.id;

      const newProject: Project = {
        ...projectData,
        id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        user_id: currentUserId,
      };

      const projectsStr = localStorage.getItem(PROJECTS_KEY);
      const allProjects: Project[] = projectsStr ? JSON.parse(projectsStr) : [];
      allProjects.push(newProject);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(allProjects));

      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      console.log("[localStorage] Create project exception:", err);
      return null;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      const projectsStr = localStorage.getItem(PROJECTS_KEY);
      const allProjects: Project[] = projectsStr ? JSON.parse(projectsStr) : [];

      const filteredProjects = allProjects.filter((p) => p.id !== projectId);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(filteredProjects));

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      return true;
    } catch {
      return false;
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project | null> => {
    try {
      const projectsStr = localStorage.getItem(PROJECTS_KEY);
      const allProjects: Project[] = projectsStr ? JSON.parse(projectsStr) : [];

      const projectIndex = allProjects.findIndex((p) => p.id === projectId);
      if (projectIndex === -1) {
        return null;
      }

      const updatedProject = { ...allProjects[projectIndex], ...updates };
      allProjects[projectIndex] = updatedProject;
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(allProjects));

      setProjects((prev) => prev.map((p) => (p.id === projectId ? updatedProject : p)));
      return updatedProject;
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
