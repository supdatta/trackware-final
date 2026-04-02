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

const getStoredProjects = (): Project[] => {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveProjects = (projects: Project[]) => {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const useProjects = (userId?: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(() => {
    const allProjects = getStoredProjects();
    // Show all projects (no user filtering for simplicity)
    setProjects(allProjects);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = (projectData: Omit<Project, "id" | "created_at">): Project => {
    const newProject: Project = {
      ...projectData,
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      user_id: userId,
    };

    const allProjects = getStoredProjects();
    allProjects.unshift(newProject);
    saveProjects(allProjects);
    setProjects(allProjects);
    
    return newProject;
  };

  const deleteProject = (projectId: string): boolean => {
    const allProjects = getStoredProjects();
    const filtered = allProjects.filter(p => p.id !== projectId);
    
    if (filtered.length === allProjects.length) {
      return false; // Project not found
    }
    
    saveProjects(filtered);
    setProjects(filtered);
    return true;
  };

  const updateProject = (projectId: string, updates: Partial<Project>): Project | null => {
    const allProjects = getStoredProjects();
    const index = allProjects.findIndex(p => p.id === projectId);
    
    if (index === -1) return null;
    
    allProjects[index] = { ...allProjects[index], ...updates };
    saveProjects(allProjects);
    setProjects(allProjects);
    
    return allProjects[index];
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
