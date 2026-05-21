import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/environment/page-header";
import { RefreshIndicator } from "@/components/environment/refresh-indicator";
import { StatCard } from "@/components/environment/stat-card";
import { ErrorState } from "@/components/environment/error-state";
import {
  TASK_STATES,
  TaskDetailContent,
  TaskTableSkeleton,
  formatBytes,
  getStateCount,
  type RowAction,
  type SortDirection,
} from "@/components/environment/task-shared";
import { TaskTable } from "@/components/environment/task-table";
import {
  useQueueDetail,
  useTaskList,
  useRunTask,
  useDeleteTask,
  useArchiveTask,
  useCancelTask,
  useBulkRunTasks,
  useBulkDeleteTasks,
  useBulkArchiveTasks,
  type TaskState,
  type BulkRunState,
  type BulkArchiveState,
  type BulkDeleteState,
} from "@/hooks/use-queue-detail";
import { usePauseQueue, useUnpauseQueue, useDeleteQueue } from "@/hooks/use-queues";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Pause,
  Play,
  Trash2,
  Zap,
} from "lucide-react";
import { sileo } from "sileo";
import { getErrorMessage } from "@/lib/errors";
import type { queue } from "../../../wailsjs/go/models";

export const Route = createFileRoute("/environment/$id/queues/$queueName")({
  component: QueueDetailPage,
});

const PAGE_SIZE = 20;

function QueueDetailPage() {
  const { id, queueName } = Route.useParams();
  const navigate = useNavigate();
  const environmentId = Number(id);

  const { data, isLoading, isError, error, dataUpdatedAt, isFetching, refetch } = useQueueDetail(environmentId, queueName);
  const pauseMutation = usePauseQueue(environmentId);
  const unpauseMutation = useUnpauseQueue(environmentId);
  const deleteMutation = useDeleteQueue(environmentId);

  const [activeTab, setActiveTab] = useState<TaskState>("pending");
  const [page, setPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedTask, setSelectedTask] = useState<queue.TaskInfo | null>(null);
  const [deleteQueueOpen, setDeleteQueueOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<{
    type: "run" | "archive" | "delete";
    state: TaskState;
  } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const taskList = useTaskList(environmentId, queueName, activeTab, page, PAGE_SIZE, sortDirection);

  const runTask = useRunTask(environmentId, queueName);
  const deleteTask = useDeleteTask(environmentId, queueName);
  const archiveTask = useArchiveTask(environmentId, queueName);
  const cancelTask = useCancelTask(environmentId);
  const bulkRun = useBulkRunTasks(environmentId, queueName);
  const bulkDelete = useBulkDeleteTasks(environmentId, queueName);
  const bulkArchive = useBulkArchiveTasks(environmentId, queueName);

  const info = data?.info;
  const history = data?.history ?? [];
  const tasks = taskList.data?.tasks ?? [];
  const totalCount = taskList.data?.totalCount ?? 0;
  // The backend globally sorts at most `sortLimit` tasks before paginating, so
  // pagination is bounded to that window and we surface a notice when exceeded.
  const sortLimit = taskList.data?.sortLimit ?? 0;
  const sortableCount = sortLimit > 0 ? Math.min(totalCount, sortLimit) : totalCount;
  const totalPages = Math.max(1, Math.ceil(sortableCount / PAGE_SIZE));
  const sortCapped = sortLimit > 0 && totalCount > sortLimit;

  const handleToggleSort = () => {
    setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TaskState);
    setPage(1);
    setSortDirection("desc");
  };

  const handleTogglePause = () => {
    if (!info) return;
    if (info.paused) {
      unpauseMutation.mutate(queueName, {
        onSuccess: () => sileo.success({ title: `Queue "${queueName}" resumed` }),
        onError: (err) => sileo.error({ title: `Failed to resume: ${getErrorMessage(err)}` }),
      });
    } else {
      pauseMutation.mutate(queueName, {
        onSuccess: () => sileo.success({ title: `Queue "${queueName}" paused` }),
        onError: (err) => sileo.error({ title: `Failed to pause: ${getErrorMessage(err)}` }),
      });
    }
  };

  const handleDeleteQueue = () => {
    deleteMutation.mutate(
      { queueName, force: (info?.size ?? 0) > 0 },
      {
        onSuccess: () => {
          sileo.success({ title: `Queue "${queueName}" deleted` });
          navigate({ to: "/environment/$id/queues", params: { id } });
        },
        onError: (err) => sileo.error({ title: `Failed to delete: ${getErrorMessage(err)}` }),
        onSettled: () => setDeleteQueueOpen(false),
      }
    );
  };

  const executeTaskAction = (action: "run" | "delete" | "archive" | "cancel", taskID: string) => {
    const mutations = { run: runTask, delete: deleteTask, archive: archiveTask, cancel: cancelTask };
    const labels = { run: "queued", delete: "deleted", archive: "archived", cancel: "cancel signal sent" };
    mutations[action].mutate(taskID, {
      onSuccess: () => {
        sileo.success({ title: `Task ${labels[action]}` });
        setSelectedTask(null);
      },
      onError: (err) => sileo.error({ title: `Failed: ${getErrorMessage(err)}` }),
    });
  };

  const handleTaskAction = (action: "run" | "delete" | "archive" | "cancel", taskID: string) => {
    if (action === "delete") {
      setPendingDeleteId(taskID);
    } else {
      executeTaskAction(action, taskID);
    }
  };

  const handleBulkAction = () => {
    if (!bulkAction) return;
    const { type, state } = bulkAction;
    const opts = {
      onSuccess: (result: queue.BulkActionResult) =>
        sileo.success({ title: `${result.count} task(s) ${type === "run" ? "queued" : type + "d"}` }),
      onError: (err: unknown) => sileo.error({ title: `Failed: ${getErrorMessage(err)}` }),
      onSettled: () => setBulkAction(null),
    };
    // BULK_ACTIONS guarantees the state is valid for the chosen action; the
    // casts narrow TaskState to each mutation's accepted subset.
    switch (type) {
      case "run":
        bulkRun.mutate(state as BulkRunState, opts);
        break;
      case "archive":
        bulkArchive.mutate(state as BulkArchiveState, opts);
        break;
      case "delete":
        bulkDelete.mutate(state as BulkDeleteState, opts);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <PageHeader title={queueName} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded" />
          ))}
        </div>
        <Skeleton className="h-64 rounded" />
        <Skeleton className="h-96 rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 space-y-4">
        <PageHeader title={queueName} />
        <ErrorState
          title="Failed to load queue data"
          error={error}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title={queueName}
        description="Queue detail and task management."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/environment/$id/queues" params={{ id }}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePause}
              disabled={pauseMutation.isPending || unpauseMutation.isPending}
            >
              {info?.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {info?.paused ? "Resume" : "Pause"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteQueueOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <RefreshIndicator
              intervalMs={5000}
              dataUpdatedAt={dataUpdatedAt}
              onRefresh={refetch}
              isFetching={isFetching}
            />
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Size"
          value={info?.size ?? 0}
          subtitle={info?.paused ? "paused" : "active"}
          icon={Layers}
        />
        <StatCard
          title="Processed"
          value={(info?.processedTotal ?? 0).toLocaleString()}
          subtitle={`${info?.processed ?? 0} today`}
          icon={Zap}
          iconColor="text-(--color-success)"
        />
        <StatCard
          title="Failed"
          value={(info?.failedTotal ?? 0).toLocaleString()}
          subtitle={`${info?.failed ?? 0} today`}
          icon={AlertTriangle}
          iconColor="text-(--color-error)"
        />
        <StatCard
          title="Latency"
          value={`${info?.latencyMs ?? 0}ms`}
          subtitle={formatBytes(info?.memoryUsage ?? 0)}
          icon={Clock}
          iconColor="text-(--color-warning)"
        />
      </div>

      {/* Processing history */}
      {history.length > 0 && (
        <div className="rounded border border-(--color-divider) bg-(--color-primary-light) p-4">
          <h2 className="mb-3 text-sm font-semibold text-(--color-text-primary)">
            Processing History (last 14 days)
          </h2>
          <div className="grid grid-cols-7 gap-2 lg:grid-cols-14">
            {history
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((day) => (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-1 rounded-lg border border-(--color-divider) bg-(--color-primary-bg) p-2 text-center"
                >
                  <span className="text-xs text-(--color-text-secondary)">
                    {new Date(day.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-xs font-semibold text-(--color-success)">{day.processed}</span>
                  <span className="text-xs text-(--color-error)">
                    {day.failed > 0 ? `${day.failed} failed` : "\u00A0"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Task browser */}
      <div className="rounded border border-(--color-divider) bg-(--color-primary-light)">
        <div className="flex items-center gap-2 border-b border-(--color-divider) px-4 py-3">
          <Activity className="h-4 w-4 text-(--color-accent-val)" />
          <h2 className="text-sm font-semibold text-(--color-text-primary)">Tasks</h2>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="border-b border-(--color-divider) px-4">
            <TabsList className="h-auto bg-transparent p-0">
              {TASK_STATES.map((s) => {
                const count = getStateCount(info, s.value);
                return (
                  <TabsTrigger
                    key={s.value}
                    value={s.value}
                    className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs data-[state=active]:bg-transparent"
                    data-color={s.value}
                  >
                    {s.label}
                    {count > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1.5 h-5 min-w-5 px-1 text-xs"
                      >
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {TASK_STATES.map((s) => (
            <TabsContent key={s.value} value={s.value} className="mt-0">
              <TaskStateContent
                state={s.value}
                tasks={activeTab === s.value ? tasks : []}
                totalCount={activeTab === s.value ? totalCount : 0}
                page={page}
                totalPages={totalPages}
                isLoading={taskList.isLoading}
                sortDirection={sortDirection}
                sortCapped={activeTab === s.value && sortCapped}
                sortLimit={sortLimit}
                onToggleSort={handleToggleSort}
                onPageChange={setPage}
                onTaskAction={handleTaskAction}
                onTaskSelect={setSelectedTask}
                onBulkAction={(type) => setBulkAction({ type, state: s.value })}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Task detail sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Task Detail</SheetTitle>
          </SheetHeader>
          {selectedTask && <TaskDetailContent task={selectedTask} onAction={handleTaskAction} />}
        </SheetContent>
      </Sheet>

      {/* Delete queue dialog */}
      <AlertDialog open={deleteQueueOpen} onOpenChange={setDeleteQueueOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete queue &ldquo;{queueName}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {(info?.size ?? 0) > 0
                ? `This queue has ${info!.size} task(s). All tasks will be permanently deleted. This action cannot be undone.`
                : "This empty queue will be permanently deleted. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteQueue}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk action dialog */}
      <AlertDialog open={!!bulkAction} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction?.type === "run" && "Run all tasks?"}
              {bulkAction?.type === "archive" && "Archive all tasks?"}
              {bulkAction?.type === "delete" && "Delete all tasks?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction?.type === "run" &&
                `All ${bulkAction.state} tasks will be moved to pending for immediate processing.`}
              {bulkAction?.type === "archive" &&
                `All ${bulkAction.state} tasks will be archived.`}
              {bulkAction?.type === "delete" &&
                `All ${bulkAction.state} tasks will be permanently deleted. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={bulkAction?.type === "delete" ? "destructive" : "default"}
              onClick={handleBulkAction}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single task delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) executeTaskAction("delete", pendingDeleteId);
                setPendingDeleteId(null);
              }}
              className="bg-[--color-error] hover:bg-[--color-error]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task state content (bulk actions bar + table + pagination)
// ---------------------------------------------------------------------------

type BulkActionType = "run" | "archive" | "delete";

const BULK_ACTIONS: Record<TaskState, BulkActionType[]> = {
  pending: ["archive", "delete"],
  active: [],
  scheduled: ["run", "archive", "delete"],
  retry: ["run", "archive", "delete"],
  archived: ["run", "delete"],
  completed: ["delete"],
};

const BULK_LABELS: Record<BulkActionType, { label: string; icon: typeof Play }> = {
  run: { label: "Run All", icon: Play },
  archive: { label: "Archive All", icon: Archive },
  delete: { label: "Delete All", icon: Trash2 },
};


function TaskStateContent({
  state,
  tasks,
  totalCount,
  page,
  totalPages,
  isLoading,
  sortDirection,
  sortCapped,
  sortLimit,
  onToggleSort,
  onPageChange,
  onTaskAction,
  onTaskSelect,
  onBulkAction,
}: {
  state: TaskState;
  tasks: queue.TaskInfo[];
  totalCount: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  sortDirection: SortDirection;
  sortCapped: boolean;
  sortLimit: number;
  onToggleSort: () => void;
  onPageChange: (p: number) => void;
  onTaskAction: (action: RowAction, taskID: string) => void;
  onTaskSelect: (task: queue.TaskInfo) => void;
  onBulkAction: (type: BulkActionType) => void;
}) {
  const bulkActions = BULK_ACTIONS[state];

  return (
    <div>
      {/* Bulk actions */}
      {bulkActions.length > 0 && totalCount > 0 && (
        <div className="flex items-center gap-2 border-b border-(--color-divider) px-4 py-2">
          <span className="text-xs text-(--color-text-secondary)">
            {totalCount} task(s)
          </span>
          <div className="ml-auto flex gap-1.5">
            {bulkActions.map((action) => {
              const { label, icon: Icon } = BULK_LABELS[action];
              return (
                <Button
                  key={action}
                  variant={action === "delete" ? "destructive" : "outline"}
                  size="xs"
                  onClick={() => onBulkAction(action)}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort cap notice */}
      {sortCapped && (
        <div className="border-b border-(--color-divider) px-4 py-2 text-xs text-(--color-text-muted)">
          {`Sorting the first ${sortLimit.toLocaleString()} of ${totalCount.toLocaleString()} tasks.`}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <TaskTableSkeleton state={state} />
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-16 text-sm text-(--color-text-secondary)">
          <p>{`No ${state} tasks`}</p>
          {state === "completed" && (
            <p className="text-xs text-(--color-text-muted)">Tasks require the Retention option to appear here</p>
          )}
        </div>
      ) : (
        <>
          <TaskTable
            state={state}
            tasks={tasks}
            sortDirection={sortDirection}
            onToggleSort={onToggleSort}
            onTaskSelect={onTaskSelect}
            onTaskAction={onTaskAction}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-(--color-divider) px-4 py-3">
              <span className="text-xs text-(--color-text-secondary)">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

