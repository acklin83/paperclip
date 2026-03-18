import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { contactsApi } from "../api/contacts";
import { queryKeys } from "../lib/queryKeys";
import { StatusBadge } from "../components/StatusBadge";
import { CheckCircle2, Clock, AlertCircle, Folder, ExternalLink } from "lucide-react";
import type { PortalIssue, PortalProject } from "@paperclipai/shared";

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function priorityColor(priority: string) {
  switch (priority) {
    case "urgent": return "text-red-500";
    case "high": return "text-orange-500";
    case "medium": return "text-yellow-500";
    case "low": return "text-blue-500";
    default: return "text-muted-foreground";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "done": return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "in_progress": return <Clock className="h-4 w-4 text-blue-500 shrink-0" />;
    case "blocked": return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default: return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />;
  }
}

function IssueCard({ issue }: { issue: PortalIssue }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      {statusIcon(issue.status)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono shrink-0">{issue.identifier}</span>
          <span className="text-sm font-medium truncate">{issue.title}</span>
          {issue.projectName && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
              <Folder className="h-3 w-3" />
              {issue.projectName}
            </span>
          )}
        </div>
        {issue.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{issue.description}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
        <StatusBadge status={issue.status} />
        <span className={`text-xs ${priorityColor(issue.priority)}`}>{issue.priority}</span>
        <span className="text-xs text-muted-foreground">{relativeDate(issue.updatedAt)}</span>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: PortalProject }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      {project.color ? (
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
      ) : (
        <div className="h-3 w-3 rounded-full bg-muted-foreground/30 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{project.name}</span>
        {project.description && (
          <p className="text-xs text-muted-foreground truncate">{project.description}</p>
        )}
      </div>
      <StatusBadge status={project.status} />
    </div>
  );
}

export function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.contacts.portal(token ?? ""),
    queryFn: () => contactsApi.getPortalData(token!),
    enabled: Boolean(token),
    retry: false,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">This portal link is not valid.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Loading portal…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Portal Not Found</h1>
          <p className="text-sm text-muted-foreground">
            This link may have expired or been revoked. Contact your project manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  const activeIssues = data.issues.filter((i) => !["done", "cancelled"].includes(i.status));
  const completedIssues = data.issues.filter((i) => ["done", "cancelled"].includes(i.status));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Project Portal</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Hello, <span className="font-medium text-foreground">{data.contact.name}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">{data.issues.length}</div>
              <div className="text-xs text-muted-foreground">total issues</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{activeIssues.length}</div>
            <div className="text-xs text-muted-foreground mt-1">In Progress</div>
          </div>
          <div className="border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{completedIssues.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{data.projects.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Projects</div>
          </div>
        </div>

        {/* Projects */}
        {data.projects.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Projects
            </h2>
            <div className="border border-border bg-card">
              {data.projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        )}

        {/* Active Issues */}
        {activeIssues.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Active Work
            </h2>
            <div className="border border-border bg-card">
              {activeIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </section>
        )}

        {/* Completed Issues */}
        {completedIssues.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Completed
            </h2>
            <div className="border border-border bg-card opacity-75">
              {completedIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </section>
        )}

        {data.issues.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No issues yet. Check back soon.</p>
          </div>
        )}

        <footer className="text-center text-xs text-muted-foreground/50 pt-4">
          Powered by Paperclip
        </footer>
      </div>
    </div>
  );
}
