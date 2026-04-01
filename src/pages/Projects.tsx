import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  GitBranch, Plus, Trash2, Activity, Clock, DollarSign,
  Users, ExternalLink, FolderOpen, BarChart3, ArrowRight, Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  name: string;
  role: string;
}

interface Project {
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
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const ProjectCard = ({
  project,
  onOpen,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}) => {
  const isGithub = project.type === "github";

  return (
    <div className="glass-card group flex flex-col hover:border-primary/40 transition-all duration-200">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGithub ? "bg-primary/10" : "bg-blue-500/10"}`}>
            {isGithub
              ? <GitBranch className="w-5 h-5 text-primary" />
              : <BarChart3 className="w-5 h-5 text-blue-400" />}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        </div>

        <h3 className="font-display text-base font-semibold text-foreground mb-1 truncate">{project.name}</h3>
        {project.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{project.description}</p>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {isGithub && project.github_url && (
            <div className="flex items-center gap-1.5 truncate">
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{project.github_url.replace("https://github.com/", "")}</span>
            </div>
          )}
          {project.budget !== undefined && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 shrink-0" />
              <span>${project.budget.toLocaleString()} budget</span>
            </div>
          )}
          {isGithub && project.team_count !== undefined && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 shrink-0" />
              <span>{project.team_count} team members</span>
            </div>
          )}
          {!isGithub && project.schedule_weeks && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 shrink-0" />
              <span>Week {project.current_week || 1} of {project.schedule_weeks}</span>
            </div>
          )}
          {!isGithub && project.team_members && project.team_members.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 shrink-0" />
              <span>{project.team_members.length} team members</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/60">{timeAgo(project.created_at)}</span>
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          Open <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const Projects = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "github" | "manual">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch projects");
        const data: Project[] = await res.json();
        setProjects(data);
      } catch (err) {
        console.error("Error fetching projects:", err);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [authLoading]);

  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete project");
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      toast.success("Project deleted");
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpen = (project: Project) => {
    if (project.type === "github") {
      navigate("/dashboard/github", {
        state: { githubUrl: project.github_url, budget: project.budget, teamCount: project.team_count },
      });
    } else {
      navigate("/dashboard/spm", { state: { project } });
    }
  };

  const filtered = projects.filter(p => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.github_url?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const githubCount = projects.filter(p => p.type === "github").length;
  const manualCount = projects.filter(p => p.type === "manual").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 gradient-mesh opacity-30 pointer-events-none" />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{projectToDelete?.name}</span>? 
              This action cannot be undone and all project data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isDeleting}
              className="bg-secondary text-foreground border-border hover:bg-secondary/80"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="relative z-10">
        <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-lime-sm">
                <Activity className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-primary">trackware</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link to="/dashboard/github" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                Dashboard
              </Link>
              <button
                onClick={() => navigate("/setup")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110 transition-all text-sm glow-lime-sm"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">My Projects</h1>
            <p className="text-muted-foreground text-sm">All your saved dashboards — reopen any time to pick up where you left off.</p>
          </div>

          {!loading && projects.length === 0 && (
            <div className="text-center py-20">
              <FolderOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">No projects yet</h2>
              <p className="text-muted-foreground mb-6 text-sm">Create your first project to start tracking. Your dashboards will appear here.</p>
              <button
                onClick={() => navigate("/setup")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110 transition-all glow-lime"
              >
                <Plus className="w-4 h-4" />
                Create First Project
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!loading && projects.length > 0 && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search projects…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { key: "all", label: `All (${projects.length})` },
                    { key: "github", label: `GitHub (${githubCount})` },
                    { key: "manual", label: `Manual (${manualCount})` },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterType(tab.key as any)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                        filterType === tab.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  No projects match your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => handleOpen(project)}
                      onDelete={() => openDeleteDialog(project)}
                    />
                  ))}
                  <button
                    onClick={() => navigate("/setup")}
                    className="glass-card border-dashed flex flex-col items-center justify-center gap-3 p-8 hover:border-primary/40 transition-all text-muted-foreground hover:text-primary group min-h-[180px]"
                  >
                    <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:border-primary transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">New Project</span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Projects;
