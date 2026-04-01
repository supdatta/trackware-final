import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import GitHubTracker from "@/components/dashboard/GitHubTracker";
import SPMDashboard from "@/components/dashboard/SPMDashboard";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, LayoutDashboard, Settings, Moon, Sun, Bell, BellOff, GitBranch, BarChart3 } from "lucide-react";
import { useState } from "react";

const pageConfig: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  "/dashboard/github": { title: "Repository Scanner", description: "Scan any public GitHub repo to see real-time project metrics", icon: GitBranch },
  "/dashboard/spm": { title: "Project Metrics", description: "Earned value, cost tracking, and team health", icon: BarChart3 },
  "/dashboard/settings": { title: "Settings", description: "Workspace controls and preferences", icon: Settings },
};

const Dashboard = () => {
  const location = useLocation();
  const activePath = Object.keys(pageConfig).find(k => location.pathname.startsWith(k)) || "/dashboard/github";
  const activePage = pageConfig[activePath] || pageConfig["/dashboard/github"];

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const renderPageContent = () => {
    switch (activePath) {
      case "/dashboard/settings":
        return (
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-6">
              <h3 className="font-display text-base text-foreground">Workspace Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setNotifications(!notifications)}
                  className={`glass-card-hover px-5 py-4 text-left flex items-center gap-4 transition-all ${notifications ? "border-primary/30" : ""}`}>
                  {notifications ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                  <div>
                    <div className="text-sm font-medium text-foreground">Notifications</div>
                    <div className="text-xs text-muted-foreground">{notifications ? "Enabled" : "Disabled"}</div>
                  </div>
                  <div className={`ml-auto w-10 h-6 rounded-full p-0.5 transition-colors ${notifications ? "bg-primary" : "bg-muted"}`}>
                    <div className={`w-5 h-5 rounded-full bg-background transition-transform ${notifications ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                </button>
                <button onClick={() => setDarkMode(!darkMode)}
                  className={`glass-card-hover px-5 py-4 text-left flex items-center gap-4 transition-all ${darkMode ? "border-primary/30" : ""}`}>
                  {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-health-amber" />}
                  <div>
                    <div className="text-sm font-medium text-foreground">Appearance</div>
                    <div className="text-xs text-muted-foreground">{darkMode ? "Dark mode" : "Light mode"}</div>
                  </div>
                  <div className={`ml-auto w-10 h-6 rounded-full p-0.5 transition-colors ${darkMode ? "bg-primary" : "bg-muted"}`}>
                    <div className={`w-5 h-5 rounded-full bg-background transition-transform ${darkMode ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      case "/dashboard/spm":
        return <SPMDashboard />;
      case "/dashboard/github":
      default:
        return <GitHubTracker />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl px-8 h-16 flex items-center">
          <div className="flex items-start gap-3">
            <activePage.icon className="w-4 h-4 text-primary mt-1" />
            <div>
              <h1 className="font-display text-lg font-semibold text-foreground">{activePage.title}</h1>
              <p className="text-xs text-muted-foreground">{activePage.description}</p>
            </div>
          </div>
        </header>
        <div className="p-8">{renderPageContent()}</div>
      </main>
    </div>
  );
};

export default Dashboard;
