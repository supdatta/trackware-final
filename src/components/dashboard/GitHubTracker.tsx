import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  GitBranch, GitCommit, Star, GitFork, AlertCircle, Users, Code,
  ExternalLink, Loader2, Eye, Tag, Calendar, Clock, GitPullRequest,
  TrendingUp, TrendingDown, CheckCircle, BarChart3, Activity,
  DollarSign, Zap, Shield, Target, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

interface RepoMetrics {
  repoAgeDays: number;
  daysSinceLastUpdate: number;
  totalCommitsFetched: number;
  totalBranches: number;
  totalContributors: number;
  totalReleases: number;
  openIssues: number;
  closedIssues: number;
  avgIssueCloseTimeDays: number | null;
  openPRs: number;
  closedPRs: number;
  mergedPRs: number;
  prMergeRate: number | null;
  avgPrMergeTimeDays: number | null;
}

interface GitHubData {
  repo: {
    name: string;
    description: string | null;
    default_branch: string;
    stars: number;
    forks: number;
    watchers: number;
    open_issues: number;
    language: string | null;
    license: string | null;
    updated_at: string;
    created_at: string;
    size_kb: number;
    has_wiki: boolean;
    has_pages: boolean;
    archived: boolean;
    topics: string[];
  };
  metrics: RepoMetrics;
  languages: { name: string; bytes: number; percentage: number }[];
  contributors: { login: string; avatar: string; contributions: number; percentage: number }[];
  branches: { name: string; sha: string; protected: boolean }[];
  commits: { sha: string; message: string; author: string; date: string; avatar: string | null }[];
  weeklyActivity: { week: string; total: number; days: number[] }[];
  releases: { tag: string; name: string; published_at: string; prerelease: boolean }[];
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "hsl(210, 60%, 50%)", JavaScript: "hsl(50, 90%, 50%)", Python: "hsl(210, 50%, 40%)",
  Java: "hsl(20, 70%, 50%)", Go: "hsl(190, 80%, 45%)", Rust: "hsl(25, 70%, 45%)",
  Ruby: "hsl(0, 60%, 50%)", PHP: "hsl(240, 50%, 55%)", C: "hsl(200, 30%, 45%)",
  "C++": "hsl(340, 50%, 50%)", "C#": "hsl(280, 50%, 50%)", Swift: "hsl(15, 80%, 55%)",
  Kotlin: "hsl(260, 60%, 55%)", Dart: "hsl(190, 70%, 50%)", Shell: "hsl(120, 30%, 45%)",
  HTML: "hsl(15, 80%, 55%)", CSS: "hsl(260, 60%, 55%)", SCSS: "hsl(330, 60%, 55%)",
};
const getColor = (lang: string, i: number) => LANG_COLORS[lang] || `hsl(${(i * 47) % 360}, 60%, 50%)`;

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtMoney = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

const MetricCard = ({ label, value, icon: Icon, sub, trend, highlight }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string;
  trend?: "up" | "down" | "neutral"; highlight?: boolean;
}) => (
  <div className={`glass-card p-4 flex flex-col gap-2 ${highlight ? "border-primary/40" : ""}`}>
    <div className="flex items-center justify-between">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${highlight ? "bg-primary/20" : "bg-primary/10"}`}>
        <Icon className={`w-4 h-4 ${highlight ? "text-primary" : "text-primary"}`} />
      </div>
      {trend === "up" && <TrendingUp className="w-4 h-4 text-health-green" />}
      {trend === "down" && <TrendingDown className="w-4 h-4 text-health-red" />}
    </div>
    <div className="font-display text-2xl font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
    {sub && <div className="text-[10px] text-muted-foreground/70">{sub}</div>}
  </div>
);

const BusinessCard = ({ title, value, desc, icon: Icon, color, nonTechLabel }: {
  title: string; value: string; desc: string; icon: React.ElementType;
  color: "green" | "amber" | "red" | "blue"; nonTechLabel: string;
}) => {
  const colors = {
    green: "bg-health-green/10 text-health-green border-health-green/20",
    amber: "bg-health-amber/10 text-health-amber border-health-amber/20",
    red: "bg-health-red/10 text-health-red border-health-red/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <div className={`glass-card p-5 border ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className={`w-5 h-5`} />
        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{nonTechLabel}</span>
      </div>
      <div className="font-display text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs font-semibold mb-1">{title}</div>
      <div className="text-[11px] opacity-70 leading-relaxed">{desc}</div>
    </div>
  );
};

const computeHealthScore = (m: RepoMetrics, stars: number) => {
  let score = 50;
  if (m.daysSinceLastUpdate <= 1) score += 15;
  else if (m.daysSinceLastUpdate <= 7) score += 10;
  else if (m.daysSinceLastUpdate <= 30) score += 5;
  else if (m.daysSinceLastUpdate > 90) score -= 10;
  if (m.prMergeRate !== null) {
    if (m.prMergeRate >= 80) score += 10;
    else if (m.prMergeRate >= 50) score += 5;
    else score -= 5;
  }
  if (m.avgIssueCloseTimeDays !== null) {
    if (m.avgIssueCloseTimeDays <= 7) score += 10;
    else if (m.avgIssueCloseTimeDays <= 30) score += 5;
    else score -= 5;
  }
  if (m.totalContributors >= 10) score += 5;
  else if (m.totalContributors >= 3) score += 3;
  if (stars >= 100) score += 5;
  if (m.totalReleases >= 3) score += 5;
  return Math.max(0, Math.min(100, score));
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

const GitHubTracker = () => {
  const location = useLocation();
  const state = location.state as { githubUrl?: string; budget?: number; teamCount?: number } | null;

  const [url, setUrl] = useState(state?.githubUrl || "");
  const [budget, setBudget] = useState<number>(state?.budget ?? 50000);
  const [teamCount, setTeamCount] = useState<number>(state?.teamCount ?? 3);
  const [showContext, setShowContext] = useState(!state?.budget);
  const [data, setData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepo = async () => {
    if (!url.includes("github.com")) {
      setError("Please enter a valid GitHub URL");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      });

      if (res.ok) {
        const result = await res.json();
        if (!result.error) {
          setData(result);
          return;
        }
        throw new Error(result.error);
      }

      const match = url.match(/github\.com\/([^\/]+)\/([^\/\s#?]+)/);
      if (!match) throw new Error("Invalid GitHub URL");
      const apiBase = `https://api.github.com/repos/${match[1]}/${match[2].replace(/\.git$/, "")}`;
      const h = { Accept: "application/vnd.github+json" };
      const repoRes = await fetch(apiBase, { headers: h });
      if (!repoRes.ok) {
        if (repoRes.status === 404) throw new Error("Repository not found or is private.");
        if (repoRes.status === 403) throw new Error("GitHub rate limit reached. Try again later.");
        throw new Error(`GitHub API error: ${repoRes.status}`);
      }
      const rd = await repoRes.json();
      const [branchesRes, commitsRes, contribRes, langRes, issuesRes, pullsRes, releasesRes, weeklyRes] =
        await Promise.all([
          fetch(`${apiBase}/branches?per_page=100`, { headers: h }),
          fetch(`${apiBase}/commits?per_page=100`, { headers: h }),
          fetch(`${apiBase}/contributors?per_page=30`, { headers: h }),
          fetch(`${apiBase}/languages`, { headers: h }),
          fetch(`${apiBase}/issues?state=all&per_page=100`, { headers: h }),
          fetch(`${apiBase}/pulls?state=all&per_page=100`, { headers: h }),
          fetch(`${apiBase}/releases?per_page=10`, { headers: h }),
          fetch(`${apiBase}/stats/commit_activity`, { headers: h }),
        ]);

      const branches = branchesRes.ok ? await branchesRes.json() : [];
      const commits = commitsRes.ok ? await commitsRes.json() : [];
      const contributors = contribRes.ok ? await contribRes.json() : [];
      const languages = langRes.ok ? await langRes.json() : {};
      const issues = issuesRes.ok ? await issuesRes.json() : [];
      const pulls = pullsRes.ok ? await pullsRes.json() : [];
      const releases = releasesRes.ok ? await releasesRes.json() : [];
      const weekly = weeklyRes.ok ? await weeklyRes.json() : [];

      const pureIssues = Array.isArray(issues) ? issues.filter((i: any) => !i.pull_request) : [];
      const openIssues = pureIssues.filter((i: any) => i.state === "open");
      const closedIssues = pureIssues.filter((i: any) => i.state === "closed");
      const openPRs = Array.isArray(pulls) ? pulls.filter((p: any) => p.state === "open") : [];
      const closedPRs = Array.isArray(pulls) ? pulls.filter((p: any) => p.state === "closed") : [];
      const mergedPRs = Array.isArray(pulls) ? pulls.filter((p: any) => p.merged_at) : [];

      const issueCloseTimes = closedIssues.filter((i: any) => i.closed_at && i.created_at)
        .map((i: any) => (new Date(i.closed_at).getTime() - new Date(i.created_at).getTime()) / 86400000);
      const avgIssueClose = issueCloseTimes.length > 0
        ? +(issueCloseTimes.reduce((a: number, b: number) => a + b, 0) / issueCloseTimes.length).toFixed(1)
        : null;

      const prMergeTimes = mergedPRs.filter((p: any) => p.merged_at && p.created_at)
        .map((p: any) => (new Date(p.merged_at).getTime() - new Date(p.created_at).getTime()) / 86400000);
      const avgPrMerge = prMergeTimes.length > 0
        ? +(prMergeTimes.reduce((a: number, b: number) => a + b, 0) / prMergeTimes.length).toFixed(1)
        : null;

      const totalBytes = Object.values(languages).reduce((s: number, v: any) => s + (v as number), 0) as number;
      const langBreakdown = Object.entries(languages).map(([name, bytes]: [string, any]) => ({
        name, bytes: bytes as number, percentage: totalBytes > 0 ? +((bytes as number) / totalBytes * 100).toFixed(1) : 0,
      })).sort((a, b) => b.percentage - a.percentage);

      const repoAgeDays = Math.floor((Date.now() - new Date(rd.created_at).getTime()) / 86400000);
      const daysSinceLastUpdate = Math.floor((Date.now() - new Date(rd.updated_at).getTime()) / 86400000);

      setData({
        repo: {
          name: rd.full_name, description: rd.description, default_branch: rd.default_branch,
          stars: rd.stargazers_count, forks: rd.forks_count, watchers: rd.subscribers_count,
          open_issues: rd.open_issues_count, language: rd.language, license: rd.license?.spdx_id || null,
          updated_at: rd.updated_at, created_at: rd.created_at, size_kb: rd.size,
          has_wiki: rd.has_wiki, has_pages: rd.has_pages, archived: rd.archived, topics: rd.topics || [],
        },
        metrics: {
          repoAgeDays, daysSinceLastUpdate,
          totalCommitsFetched: Array.isArray(commits) ? commits.length : 0,
          totalBranches: Array.isArray(branches) ? branches.length : 0,
          totalContributors: Array.isArray(contributors) ? contributors.length : 0,
          totalReleases: Array.isArray(releases) ? releases.length : 0,
          openIssues: openIssues.length, closedIssues: closedIssues.length, avgIssueCloseTimeDays: avgIssueClose,
          openPRs: openPRs.length, closedPRs: closedPRs.length, mergedPRs: mergedPRs.length,
          prMergeRate: (closedPRs.length + mergedPRs.length) > 0
            ? +(mergedPRs.length / (closedPRs.length + mergedPRs.length) * 100).toFixed(1)
            : null,
          avgPrMergeTimeDays: avgPrMerge,
        },
        languages: langBreakdown,
        contributors: Array.isArray(contributors) ? contributors.map((c: any) => ({
          login: c.login, avatar: c.avatar_url, contributions: c.contributions,
          percentage: commits.length > 0 ? +(c.contributions / commits.length * 100).toFixed(1) : 0,
        })) : [],
        branches: Array.isArray(branches) ? branches.map((b: any) => ({
          name: b.name, sha: b.commit?.sha?.substring(0, 7), protected: b.protected,
        })) : [],
        commits: Array.isArray(commits) ? commits.slice(0, 20).map((c: any) => ({
          sha: c.sha?.substring(0, 7), message: c.commit?.message?.split("\n")[0],
          author: c.commit?.author?.name, date: c.commit?.author?.date, avatar: c.author?.avatar_url,
        })) : [],
        weeklyActivity: Array.isArray(weekly) ? weekly.slice(-12).map((w: any) => ({
          week: new Date(w.week * 1000).toISOString().split("T")[0], total: w.total, days: w.days,
        })) : [],
        releases: Array.isArray(releases) ? releases.map((r: any) => ({
          tag: r.tag_name, name: r.name, published_at: r.published_at, prerelease: r.prerelease,
        })) : [],
      });
    } catch (err: any) {
      setError(err.message || "Failed to fetch repo data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url && url.includes("github.com")) {
      fetchRepo();
    }
  }, []);

  const healthScore = data ? computeHealthScore(data.metrics, data.repo.stars) : 0;
  const healthColor = healthScore >= 75 ? "text-health-green" : healthScore >= 50 ? "text-health-amber" : "text-health-red";
  const healthStroke = healthScore >= 75 ? "hsl(142, 71%, 45%)" : healthScore >= 50 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)";
  const healthLabel = healthScore >= 75 ? "Healthy" : healthScore >= 50 ? "Needs Attention" : "At Risk";

  const circumference = 2 * Math.PI * 80;
  const progress = (healthScore / 100) * circumference;

  const radarData = data ? [
    { axis: "Activity", value: Math.min(100, data.metrics.daysSinceLastUpdate <= 1 ? 100 : data.metrics.daysSinceLastUpdate <= 7 ? 80 : data.metrics.daysSinceLastUpdate <= 30 ? 50 : 20) },
    { axis: "Community", value: Math.min(100, (data.repo.stars + data.repo.forks * 2) > 500 ? 90 : (data.repo.stars + data.repo.forks * 2) > 50 ? 60 : 30) },
    { axis: "Issues", value: data.metrics.closedIssues + data.metrics.openIssues > 0 ? Math.min(100, Math.round(data.metrics.closedIssues / (data.metrics.closedIssues + data.metrics.openIssues) * 100)) : 50 },
    { axis: "PRs", value: data.metrics.prMergeRate ?? 50 },
    { axis: "Team", value: Math.min(100, data.metrics.totalContributors >= 10 ? 90 : data.metrics.totalContributors >= 5 ? 70 : data.metrics.totalContributors >= 2 ? 50 : 25) },
  ] : [];

  const businessMetrics = data ? (() => {
    const m = data.metrics;
    const costPerCommit = m.totalCommitsFetched > 0 ? budget / m.totalCommitsFetched : null;
    const costPerMergedPR = m.mergedPRs > 0 ? budget / m.mergedPRs : null;
    const costPerContributor = m.totalContributors > 0 ? budget / m.totalContributors : null;
    const budgetPerHeadcount = teamCount > 0 ? budget / teamCount : null;
    const teamUtilization = m.totalContributors > 0 && teamCount > 0
      ? Math.min(100, Math.round((m.totalContributors / teamCount) * 100))
      : null;
    const deliveryRate = m.prMergeRate ?? 0;
    const featureVelocity = data.weeklyActivity.length > 0
      ? +(data.weeklyActivity.slice(-4).reduce((s, w) => s + w.total, 0) / 4).toFixed(1)
      : null;
    const openBranchRisk = m.totalBranches > 10 ? "High" : m.totalBranches > 5 ? "Medium" : "Low";
    const issuePressure = m.openIssues > 20 ? "High" : m.openIssues > 5 ? "Medium" : "Low";
    const overallRisk = (openBranchRisk === "High" || issuePressure === "High" || deliveryRate < 40) ? "High"
      : (openBranchRisk === "Medium" || issuePressure === "Medium" || deliveryRate < 70) ? "Medium" : "Low";

    return { costPerCommit, costPerMergedPR, costPerContributor, budgetPerHeadcount, teamUtilization, deliveryRate, featureVelocity, openBranchRisk, issuePressure, overallRisk };
  })() : null;

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Scan a Public GitHub Repository</h3>
        <div className="flex gap-3">
          <input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRepo()}
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <button
            onClick={fetchRepo}
            disabled={loading || !url.trim()}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
            {loading ? "Scanning…" : "Scan Repo"}
          </button>
        </div>

        <button
          onClick={() => setShowContext(!showContext)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Project Context (budget & team size for business metrics)
        </button>

        {showContext && (
          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-border">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Total Budget (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full bg-secondary border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Team Size (people)</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={teamCount}
                  onChange={(e) => setTeamCount(Number(e.target.value))}
                  className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-1 text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Scanning repository…</p>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  {data.repo.name}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {data.repo.archived && <span className="px-2 py-0.5 text-xs bg-health-amber/20 text-health-amber rounded-full">Archived</span>}
                </h2>
                {data.repo.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{data.repo.description}</p>}
                {data.repo.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.repo.topics.slice(0, 8).map(t => (
                      <span key={t} className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              {data.repo.language && (
                <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full shrink-0">
                  {data.repo.language}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {data.repo.stars.toLocaleString()}</span>
              <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" /> {data.repo.forks.toLocaleString()}</span>
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {data.repo.watchers.toLocaleString()}</span>
              <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> {data.repo.default_branch}</span>
              {data.repo.license && <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {data.repo.license}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {Math.round(data.metrics.repoAgeDays / 30)} months old</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Updated {timeAgo(data.repo.updated_at)}</span>
            </div>
          </div>

          {businessMetrics && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-foreground">Business Intelligence</h3>
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  Based on ${budget.toLocaleString()} budget · {teamCount} people
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <BusinessCard
                  icon={DollarSign}
                  title="Cost per Merged Feature"
                  value={businessMetrics.costPerMergedPR ? fmtMoney(businessMetrics.costPerMergedPR) : "N/A"}
                  desc={businessMetrics.costPerMergedPR
                    ? `Each shipped feature costs ${fmtMoney(businessMetrics.costPerMergedPR)} of your budget. ${businessMetrics.costPerMergedPR < 5000 ? "Great value for money." : businessMetrics.costPerMergedPR < 15000 ? "Moderate investment per feature." : "Consider reducing scope."}`
                    : "Not enough PR data to calculate."}
                  color={businessMetrics.costPerMergedPR ? (businessMetrics.costPerMergedPR < 5000 ? "green" : businessMetrics.costPerMergedPR < 15000 ? "amber" : "red") : "blue"}
                  nonTechLabel="Investment Efficiency"
                />
                <BusinessCard
                  icon={Target}
                  title="Delivery Rate"
                  value={`${businessMetrics.deliveryRate.toFixed(0)}%`}
                  desc={`${businessMetrics.deliveryRate.toFixed(0)}% of code reviews make it to production. ${businessMetrics.deliveryRate >= 75 ? "Your team ships reliably." : businessMetrics.deliveryRate >= 50 ? "Room to improve review throughput." : "Many changes are being blocked or rejected."}`}
                  color={businessMetrics.deliveryRate >= 75 ? "green" : businessMetrics.deliveryRate >= 50 ? "amber" : "red"}
                  nonTechLabel="Delivery Predictability"
                />
                <BusinessCard
                  icon={Users}
                  title="Team Coverage"
                  value={businessMetrics.teamUtilization !== null ? `${businessMetrics.teamUtilization}%` : "N/A"}
                  desc={businessMetrics.teamUtilization !== null
                    ? `${data.metrics.totalContributors} of ${teamCount} people contributed. ${businessMetrics.teamUtilization >= 80 ? "Strong team engagement." : businessMetrics.teamUtilization >= 50 ? "Some team members are inactive." : "Most of the team hasn't contributed recently."}`
                    : "Set team count to see coverage."}
                  color={businessMetrics.teamUtilization !== null ? (businessMetrics.teamUtilization >= 80 ? "green" : businessMetrics.teamUtilization >= 50 ? "amber" : "red") : "blue"}
                  nonTechLabel="Team Productivity"
                />
                <BusinessCard
                  icon={Shield}
                  title="Project Risk Level"
                  value={businessMetrics.overallRisk}
                  desc={`${businessMetrics.openBranchRisk === "High" ? `${data.metrics.totalBranches} open branches (code sprawl). ` : ""}${businessMetrics.issuePressure === "High" ? `${data.metrics.openIssues} unresolved issues. ` : ""}${businessMetrics.overallRisk === "Low" ? "Project is on track with low risk." : businessMetrics.overallRisk === "Medium" ? "Monitor closely — some indicators need attention." : "Action needed to stabilize the project."}`}
                  color={businessMetrics.overallRisk === "Low" ? "green" : businessMetrics.overallRisk === "Medium" ? "amber" : "red"}
                  nonTechLabel="Risk Assessment"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="glass-card p-4">
                  <div className="text-xs text-muted-foreground mb-1">Cost per Commit</div>
                  <div className="font-display text-xl font-bold text-foreground">
                    {businessMetrics.costPerCommit ? fmtMoney(businessMetrics.costPerCommit) : "N/A"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Each code submission costs ~{businessMetrics.costPerCommit ? fmtMoney(businessMetrics.costPerCommit) : "?"} of your budget
                  </div>
                </div>
                <div className="glass-card p-4">
                  <div className="text-xs text-muted-foreground mb-1">Budget per Person</div>
                  <div className="font-display text-xl font-bold text-foreground">
                    {businessMetrics.budgetPerHeadcount ? fmtMoney(businessMetrics.budgetPerHeadcount) : "N/A"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Average investment per team member
                  </div>
                </div>
                <div className="glass-card p-4">
                  <div className="text-xs text-muted-foreground mb-1">Avg Weekly Commits</div>
                  <div className="font-display text-xl font-bold text-foreground">
                    {businessMetrics.featureVelocity ?? "N/A"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Code changes per week (last 4 weeks)
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Commits" value={data.metrics.totalCommitsFetched} icon={GitCommit} sub="Recent 100" />
            <MetricCard label="Contributors" value={data.metrics.totalContributors} icon={Users} />
            <MetricCard label="Open Issues" value={data.metrics.openIssues} icon={AlertCircle}
              sub={data.metrics.avgIssueCloseTimeDays ? `Avg close: ${data.metrics.avgIssueCloseTimeDays}d` : undefined}
              trend={data.metrics.openIssues > data.metrics.closedIssues ? "down" : "up"} />
            <MetricCard label="Open PRs" value={data.metrics.openPRs} icon={GitPullRequest}
              sub={data.metrics.prMergeRate ? `Merge rate: ${data.metrics.prMergeRate}%` : undefined}
              trend={(data.metrics.prMergeRate ?? 0) >= 70 ? "up" : "down"} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Merged PRs" value={data.metrics.mergedPRs} icon={CheckCircle}
              sub={data.metrics.avgPrMergeTimeDays ? `Avg merge: ${data.metrics.avgPrMergeTimeDays}d` : undefined} />
            <MetricCard label="Branches" value={data.metrics.totalBranches} icon={GitBranch} />
            <MetricCard label="Releases" value={data.metrics.totalReleases} icon={Tag}
              sub={data.releases[0] ? `Latest: ${data.releases[0].tag}` : undefined} />
            <MetricCard label="Repo Size" value={data.repo.size_kb > 1000 ? `${(data.repo.size_kb / 1024).toFixed(1)} MB` : `${data.repo.size_kb} KB`} icon={BarChart3} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 flex flex-col items-center justify-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 self-start">Project Health Score</h3>
              <div className="relative w-48 h-48">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r="80" fill="none" stroke="hsl(240, 6%, 18%)" strokeWidth="8" />
                  <circle cx="90" cy="90" r="80" fill="none" stroke={healthStroke} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 8px ${healthStroke})` }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-4xl font-bold text-foreground">{healthScore}</span>
                  <span className={`text-sm font-medium ${healthColor}`}>{healthLabel}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
                Based on update recency, PR merge rate, issue resolution, contributors, and community signals.
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Health Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="hsl(240, 6%, 22%)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Health" dataKey="value" stroke="hsl(72, 95%, 55%)" fill="hsl(72, 95%, 55%)"
                    fillOpacity={0.15} strokeWidth={2} animationDuration={800} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {data.weeklyActivity.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Weekly Commit Activity (last 12 weeks)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 16%)" />
                  <XAxis dataKey="week" tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
                  <YAxis tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(240, 8%, 10%)", border: "1px solid hsl(240, 6%, 22%)", borderRadius: "8px", fontSize: "12px", color: "hsl(0, 0%, 95%)" }} />
                  <Bar dataKey="total" fill="hsl(72, 95%, 55%)" radius={[4, 4, 0, 0]} animationDuration={600} name="Commits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.languages.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Language Breakdown</h3>
                <div className="flex items-center gap-6">
                  <div className="w-40 h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.languages.slice(0, 6)} dataKey="percentage" nameKey="name" cx="50%" cy="50%"
                          innerRadius={35} outerRadius={65} strokeWidth={0} animationDuration={600}>
                          {data.languages.slice(0, 6).map((l, i) => (
                            <Cell key={l.name} fill={getColor(l.name, i)} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(240, 8%, 10%)", border: "1px solid hsl(240, 6%, 22%)", borderRadius: "8px", fontSize: "12px", color: "hsl(0, 0%, 95%)" }} formatter={(v: any) => [`${v}%`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {data.languages.slice(0, 6).map((l, i) => (
                      <div key={l.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColor(l.name, i) }} />
                        <span className="text-xs text-muted-foreground flex-1 truncate">{l.name}</span>
                        <span className="text-xs text-foreground font-medium">{l.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {data.contributors.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Top Contributors</h3>
                <div className="space-y-3">
                  {data.contributors.slice(0, 6).map((c, i) => (
                    <div key={c.login} className="flex items-center gap-3">
                      <div className="w-5 h-5 text-[10px] text-muted-foreground flex items-center justify-center font-medium">
                        {i + 1}
                      </div>
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.login} className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold">
                          {c.login[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-foreground flex-1 truncate">{c.login}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${c.percentage}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">{c.contributions} commits</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {data.commits.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Commits</h3>
              <div className="space-y-2">
                {data.commits.slice(0, 10).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.author} className="w-6 h-6 rounded-full shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold shrink-0">
                        {c.author?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <code className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono shrink-0">{c.sha}</code>
                    <span className="text-xs text-foreground flex-1 truncate">{c.message}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{c.date ? timeAgo(c.date) : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.branches.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Branches ({data.branches.length})</h3>
              <div className="flex flex-wrap gap-2">
                {data.branches.slice(0, 20).map((b) => (
                  <div key={b.name} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    b.name === data.repo.default_branch ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    <GitBranch className="w-3 h-3" />
                    {b.name}
                    {b.protected && <Zap className="w-2.5 h-2.5 text-health-amber" />}
                  </div>
                ))}
                {data.branches.length > 20 && (
                  <div className="px-2.5 py-1 text-xs text-muted-foreground">+{data.branches.length - 20} more</div>
                )}
              </div>
            </div>
          )}

          {data.releases.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Releases</h3>
              <div className="space-y-2">
                {data.releases.map((r) => (
                  <div key={r.tag} className="flex items-center gap-3 py-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">{r.tag}</span>
                    {r.name && <span className="text-xs text-muted-foreground truncate">{r.name}</span>}
                    {r.prerelease && <span className="text-[10px] bg-health-amber/20 text-health-amber px-1.5 py-0.5 rounded-full">Pre-release</span>}
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.published_at ? timeAgo(r.published_at) : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GitHubTracker;
