import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CodeBlock } from "@/components/environment/code-block";
import type { TaskState } from "@/hooks/use-queue-detail";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";
import type { queue } from "../../../wailsjs/go/models";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TASK_STATES: { value: TaskState; label: string; color: string; activeColor: string }[] = [
  { value: "pending", label: "Pending", color: "text-(--color-text-secondary)", activeColor: "border-(--color-text-secondary) text-(--color-text-primary)" },
  { value: "active", label: "Active", color: "text-(--color-success)", activeColor: "border-(--color-success) text-(--color-success)" },
  { value: "scheduled", label: "Scheduled", color: "text-(--color-info)", activeColor: "border-(--color-info) text-(--color-info)" },
  { value: "retry", label: "Retry", color: "text-(--color-warning)", activeColor: "border-(--color-warning) text-(--color-warning)" },
  { value: "archived", label: "Archived", color: "text-(--color-error)", activeColor: "border-(--color-error) text-(--color-error)" },
  { value: "completed", label: "Completed (retention)", color: "text-(--color-accent-val)", activeColor: "border-(--color-accent-val) text-(--color-accent-val)" },
];

export const TAB_COLORS: Record<TaskState, string> = {
  pending: "#a3a3a3",
  active: "#10b981",
  scheduled: "#3b82f6",
  retry: "#f59e0b",
  archived: "#f43f5e",
  completed: "#d4a843",
};

export function getDateFieldForState(task: { lastFailedAt: string; nextProcessAt: string; completedAt: string }, state: TaskState): string {
  switch (state) {
    case "scheduled": return task.nextProcessAt;
    case "retry": return task.lastFailedAt;
    case "archived": return task.lastFailedAt;
    case "completed": return task.completedAt;
    default: return "";
  }
}

export type SortDirection = "asc" | "desc";

export const DATE_COLUMN_LABEL: Partial<Record<TaskState, string>> = {
  scheduled: "Next Run",
  retry: "Last Failed",
  archived: "Last Failed",
  completed: "Completed At",
};

export type RowAction = "run" | "delete" | "archive" | "cancel";

export const ROW_ACTIONS: Record<TaskState, RowAction[]> = {
  pending: ["delete", "archive"],
  active: ["cancel"],
  scheduled: ["run", "delete", "archive"],
  retry: ["run", "delete", "archive"],
  archived: ["run", "delete"],
  completed: ["delete"],
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatDate(dateStr: string): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "\u2014";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function tryFormatJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export function getStateCount(info: queue.QueueInfo | undefined, state: TaskState): number {
  if (!info) return 0;
  const map: Record<TaskState, number> = {
    pending: info.pending,
    active: info.active,
    scheduled: info.scheduled,
    retry: info.retry,
    archived: info.archived,
    completed: info.completed,
  };
  return map[state];
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export function SortableColumnHeader({
  label,
  direction,
  onToggle,
}: {
  label: string;
  direction: SortDirection;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
    >
      {label}
      {direction === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUp className="h-3 w-3" />
      )}
    </button>
  );
}

// Renders the real task table chrome (same headers/borders/spacing) with
// skeleton cells in the body, so a loading tab reads as "this table is
// populating" instead of looking like the data was wiped.
export function TaskTableSkeleton({
  state = "pending",
  rows = 6,
}: {
  state?: TaskState;
  rows?: number;
}) {
  const showDate = !!DATE_COLUMN_LABEL[state];
  const showRetries = state === "retry";
  const showLastError = state === "retry" || state === "archived";
  const showStatus = state === "active";

  // The shared Skeleton uses `bg-accent`, which equals the panel background
  // (#1e1e1e) here and would be invisible. Use a divider tone for contrast.
  const bar = "bg-(--color-divider-dark)";

  return (
    <Table aria-busy="true">
      <TableHeader>
        <TableRow className="border-(--color-divider) hover:bg-transparent">
          <TableHead className="text-(--color-text-secondary)">ID</TableHead>
          <TableHead className="text-(--color-text-secondary)">Type</TableHead>
          <TableHead className="text-(--color-text-secondary)">Payload</TableHead>
          {showDate && (
            <TableHead className="text-(--color-text-secondary)">
              {DATE_COLUMN_LABEL[state]}
            </TableHead>
          )}
          {showRetries && (
            <TableHead className="text-right text-(--color-text-secondary)">Retries</TableHead>
          )}
          {showLastError && (
            <TableHead className="text-(--color-text-secondary)">Last Error</TableHead>
          )}
          {showStatus && (
            <TableHead className="text-center text-(--color-text-secondary)">Status</TableHead>
          )}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i} className="border-(--color-divider) hover:bg-transparent">
            <TableCell><Skeleton className={`h-4 w-16 ${bar}`} /></TableCell>
            <TableCell><Skeleton className={`h-4 w-32 ${bar}`} /></TableCell>
            <TableCell><Skeleton className={`h-4 w-full max-w-48 ${bar}`} /></TableCell>
            {showDate && (
              <TableCell><Skeleton className={`h-4 w-28 ${bar}`} /></TableCell>
            )}
            {showRetries && (
              <TableCell className="text-right"><Skeleton className={`ml-auto h-4 w-10 ${bar}`} /></TableCell>
            )}
            {showLastError && (
              <TableCell><Skeleton className={`h-4 w-32 ${bar}`} /></TableCell>
            )}
            {showStatus && (
              <TableCell><Skeleton className={`mx-auto h-5 w-16 rounded-full ${bar}`} /></TableCell>
            )}
            <TableCell><Skeleton className={`h-4 w-6 ${bar}`} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function StateBadge({ state }: { state: TaskState }) {
  const styles: Record<TaskState, string> = {
    pending: "border-(--color-text-muted) text-(--color-text-secondary)",
    active: "border-(--color-success) text-(--color-success)",
    scheduled: "border-(--color-info) text-(--color-info)",
    retry: "border-(--color-warning) text-(--color-warning)",
    archived: "border-(--color-error) text-(--color-error)",
    completed: "border-(--color-success) text-(--color-success)",
  };
  return (
    <Badge variant="outline" className={styles[state]}>
      {state}
    </Badge>
  );
}

export function DetailRow({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-xs text-(--color-text-secondary)">{label}</span>
      {children ?? (
        <span className={`truncate text-right text-xs text-(--color-text-secondary) ${mono ? "font-mono" : ""}`}>
          {value || "\u2014"}
        </span>
      )}
    </div>
  );
}

export function TaskDetailContent({
  task,
  onAction,
}: {
  task: queue.TaskInfo;
  onAction: (action: RowAction, taskID: string) => void;
}) {
  const state = task.state as TaskState;
  const actions = ROW_ACTIONS[state] ?? [];
  return (
    <div className="space-y-5 pt-4">
      <div className="space-y-3">
        <DetailRow label="ID" value={task.id} mono />
        <DetailRow label="Type" value={task.type} />
        <DetailRow label="State">
          <StateBadge state={state} />
        </DetailRow>
        <DetailRow label="Queue" value={task.queue} />
        {task.group && <DetailRow label="Group" value={task.group} />}
      </div>

      <Separator className="bg-(--color-divider)" />

      {task.payload && (
        <CodeBlock content={task.payload} label="Payload" />
      )}

      {state === "completed" && task.result && (
        <>
          <Separator className="bg-(--color-divider)" />
          <CodeBlock content={task.result} label="Result" variant="success" />
        </>
      )}

      {task.lastErr && (
        <>
          <Separator className="bg-(--color-divider)" />
          <CodeBlock content={task.lastErr} label="Last Error" variant="error" maxHeight="max-h-40" />
          {task.lastFailedAt && (
            <span className="text-xs text-(--color-text-secondary)">
              Failed at: {formatDate(task.lastFailedAt)}
            </span>
          )}
        </>
      )}

      <Separator className="bg-(--color-divider)" />

      <div className="space-y-3">
        <DetailRow label="Max Retry" value={String(task.maxRetry)} />
        <DetailRow label="Retried" value={String(task.retried)} />
        {task.nextProcessAt && <DetailRow label="Next Run" value={formatDate(task.nextProcessAt)} />}
        {task.completedAt && <DetailRow label="Completed" value={formatDate(task.completedAt)} />}
        {task.deadline && <DetailRow label="Deadline" value={formatDate(task.deadline)} />}
        <DetailRow label="Timeout" value={formatDuration(task.timeoutSecs)} />
        <DetailRow label="Retention" value={formatDuration(task.retentionSecs)} />
        {task.isOrphaned && (
          <DetailRow label="Orphaned">
            <Badge variant="outline" className="border-(--color-error) text-(--color-error)">
              Yes
            </Badge>
          </DetailRow>
        )}
      </div>

      {actions.length > 0 && (
        <>
          <Separator className="bg-(--color-divider)" />
          <div className="flex gap-2">
            {actions.map((action) => (
              <Button
                key={action}
                variant={action === "delete" ? "destructive" : "outline"}
                size="sm"
                onClick={() => onAction(action, task.id)}
              >
                {action === "run" && <><Play className="h-4 w-4" /> Run</>}
                {action === "archive" && <><Archive className="h-4 w-4" /> Archive</>}
                {action === "delete" && <><Trash2 className="h-4 w-4" /> Delete</>}
                {action === "cancel" && <><XCircle className="h-4 w-4" /> Cancel</>}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
