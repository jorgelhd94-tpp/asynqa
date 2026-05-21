import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/environment/page-header";
import { RefreshIndicator } from "@/components/environment/refresh-indicator";
import {
  TASK_STATES,
  ROW_ACTIONS,
  DATE_COLUMN_LABEL,
  TaskDetailContent,
  SortableColumnHeader,
  TaskTableSkeleton,
  type RowAction,
  type SortDirection,
  formatDate,
  getDateFieldForState,
} from "@/components/environment/task-shared";
import {
  useQueueDetail,
  useTaskList,
  useRunTask,
  useDeleteTask,
  useArchiveTask,
  useCancelTask,
  type TaskState,
} from "@/hooks/use-queue-detail";
import { useQueues } from "@/hooks/use-queues";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Archive,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  MoreHorizontal,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";
import { sileo } from "sileo";
import { getErrorMessage } from "@/lib/errors";
import type { queue } from "../../../wailsjs/go/models";

export const Route = createFileRoute("/environment/$id/tasks")({
  component: TasksPage,
});

const PAGE_SIZE = 20;

function getStateCount(info: queue.QueueInfo | undefined, state: TaskState): number {
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

function TasksPage() {
  const { id } = Route.useParams();
  const environmentId = Number(id);

  const { data: queuesData, isLoading: queuesLoading } = useQueues(environmentId);
  const queueNames = (queuesData?.queues ?? []).map((q) => q.queue);

  const [selectedQueue, setSelectedQueue] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TaskState>("pending");
  const [page, setPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedTask, setSelectedTask] = useState<queue.TaskInfo | null>(null);

  const currentQueue = selectedQueue || queueNames[0] || "";

  const { data: queueDetail } = useQueueDetail(environmentId, currentQueue);
  const taskList = useTaskList(environmentId, currentQueue, activeTab, page, PAGE_SIZE, sortDirection);
  const runTask = useRunTask(environmentId, currentQueue);
  const deleteTask = useDeleteTask(environmentId, currentQueue);
  const archiveTask = useArchiveTask(environmentId, currentQueue);
  const cancelTask = useCancelTask(environmentId);

  const tasks = taskList.data?.tasks ?? [];
  const totalCount = taskList.data?.totalCount ?? 0;
  // Backend globally sorts at most `sortLimit` tasks, so pagination is bounded
  // to that window and we surface a notice when exceeded.
  const sortLimit = taskList.data?.sortLimit ?? 0;
  const sortableCount = sortLimit > 0 ? Math.min(totalCount, sortLimit) : totalCount;
  const totalPages = Math.max(1, Math.ceil(sortableCount / PAGE_SIZE));
  const sortCapped = sortLimit > 0 && totalCount > sortLimit;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TaskState);
    setPage(1);
    setSortDirection("desc");
  };

  const handleToggleSort = () => {
    setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const handleQueueChange = (q: string) => {
    setSelectedQueue(q);
    setPage(1);
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const executeTaskAction = (action: RowAction, taskID: string) => {
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

  const handleTaskAction = (action: RowAction, taskID: string) => {
    if (action === "delete") {
      setPendingDeleteId(taskID);
    } else {
      executeTaskAction(action, taskID);
    }
  };

  const rowActions = ROW_ACTIONS[activeTab];
  const queueInfo = queueDetail?.info;

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-6">
        <PageHeader
          title="Tasks"
          description="Browse and manage tasks across queues."
          actions={
            <RefreshIndicator
              intervalMs={5000}
              dataUpdatedAt={taskList.dataUpdatedAt}
              onRefresh={taskList.refetch}
              isFetching={taskList.isFetching}
            />
          }
        />

        <div className="flex items-center gap-3">
          <label className="text-xs text-(--color-text-secondary)">Queue:</label>
          {queuesLoading ? (
            <Skeleton className="h-8 w-48 rounded-md" />
          ) : queueNames.length > 0 ? (
            <select
              value={currentQueue}
              onChange={(e) => handleQueueChange(e.target.value)}
              className="h-8 rounded-md border border-(--color-divider) bg-(--color-primary-bg) px-3 text-xs text-(--color-text-primary) outline-none focus:border-(--color-accent-val) cursor-pointer"
            >
              {queueNames.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-(--color-text-secondary)">No queues available</span>
          )}
        </div>

        {currentQueue && (
          <div className="rounded border border-(--color-divider) bg-(--color-primary-light)">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="border-b border-(--color-divider) px-4">
                <TabsList className="h-auto bg-transparent p-0">
                  {TASK_STATES.map((s) => {
                    const count = getStateCount(queueInfo, s.value);
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
                  {taskList.isLoading ? (
                    <TaskTableSkeleton state={activeTab} />
                  ) : tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-(--color-text-secondary)">
                      <div className="text-center">
                        <ListChecks className="mx-auto mb-2 h-6 w-6 text-(--color-text-muted)" />
                        <p>{`No ${s.value} tasks in "${currentQueue}"`}</p>
                        {s.value === "completed" && (
                          <p className="mt-1 text-xs text-(--color-text-muted)">Tasks require the Retention option to appear here</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 border-b border-(--color-divider) px-4 py-2">
                        <span className="text-xs text-(--color-text-secondary)">
                          {totalCount} task(s)
                        </span>
                        {sortCapped && (
                          <span className="ml-auto text-xs text-(--color-text-muted)">
                            {`Sorting the first ${sortLimit.toLocaleString()} of ${totalCount.toLocaleString()}`}
                          </span>
                        )}
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow className="border-(--color-divider) hover:bg-transparent">
                            <TableHead className="text-(--color-text-secondary)">ID</TableHead>
                            <TableHead className="text-(--color-text-secondary)">Type</TableHead>
                            <TableHead className="text-(--color-text-secondary)">Payload</TableHead>
                            {DATE_COLUMN_LABEL[activeTab] && (
                              <TableHead>
                                <SortableColumnHeader
                                  label={DATE_COLUMN_LABEL[activeTab]!}
                                  direction={sortDirection}
                                  onToggle={handleToggleSort}
                                />
                              </TableHead>
                            )}
                            {activeTab === "retry" && (
                              <TableHead className="text-(--color-text-secondary)">Retries</TableHead>
                            )}
                            {(activeTab === "retry" || activeTab === "archived") && (
                              <TableHead className="text-(--color-text-secondary)">Last Error</TableHead>
                            )}
                            {activeTab === "active" && (
                              <TableHead className="text-(--color-text-secondary)">Status</TableHead>
                            )}
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map((t) => (
                            <TableRow
                              key={t.id}
                              className="border-(--color-divider) hover:bg-(--color-row-hover) cursor-pointer transition-colors"
                              onClick={() => setSelectedTask(t)}
                            >
                              <TableCell className="font-mono text-xs text-(--color-text-secondary)">
                                {t.id.slice(0, 8)}
                              </TableCell>
                              <TableCell className="font-medium text-(--color-text-primary)">
                                {t.type}
                              </TableCell>
                              <TableCell className="max-w-48 truncate text-xs text-(--color-text-secondary)">
                                {t.payload?.slice(0, 60)}
                              </TableCell>
                              {DATE_COLUMN_LABEL[activeTab] && (
                                <TableCell className="text-xs text-(--color-text-secondary)">
                                  {formatDate(getDateFieldForState(t, activeTab))}
                                </TableCell>
                              )}
                              {activeTab === "retry" && (
                                <TableCell className="text-xs">
                                  <span className="text-(--color-warning)">
                                    {t.retried}/{t.maxRetry}
                                  </span>
                                </TableCell>
                              )}
                              {(activeTab === "retry" || activeTab === "archived") && (
                                <TableCell className="max-w-32 truncate text-xs text-(--color-error)">
                                  {t.lastErr}
                                </TableCell>
                              )}
                              {activeTab === "active" && (
                                <TableCell>
                                  {t.isOrphaned ? (
                                    <Badge variant="outline" className="border-(--color-error) text-(--color-error) text-xs">
                                      Orphaned
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-(--color-success) text-(--color-success) text-xs">
                                      Running
                                    </Badge>
                                  )}
                                </TableCell>
                              )}
                              {activeTab === "completed" && (
                                <TableCell className="text-xs text-(--color-text-secondary)">
                                  {formatDate(t.completedAt)}
                                </TableCell>
                              )}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                {rowActions.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon-xs" className="text-(--color-text-secondary) hover:text-(--color-text-primary)">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {rowActions.map((action, i) => (
                                        <div key={action}>
                                          {i > 0 && action === "delete" && <DropdownMenuSeparator />}
                                          <DropdownMenuItem
                                            variant={action === "delete" ? "destructive" : undefined}
                                            onClick={() => handleTaskAction(action, t.id)}
                                          >
                                            {action === "run" && <><Play className="h-4 w-4" /> Run</>}
                                            {action === "archive" && <><Archive className="h-4 w-4" /> Archive</>}
                                            {action === "delete" && <><Trash2 className="h-4 w-4" /> Delete</>}
                                            {action === "cancel" && <><XCircle className="h-4 w-4" /> Cancel</>}
                                          </DropdownMenuItem>
                                        </div>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

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
                              onClick={() => setPage(page - 1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon-xs"
                              disabled={page >= totalPages}
                              onClick={() => setPage(page + 1)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-base">Task Detail</SheetTitle>
            </SheetHeader>
            {selectedTask && (
              <TaskDetailContent task={selectedTask} onAction={handleTaskAction} />
            )}
          </SheetContent>
        </Sheet>

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
    </div>
  );
}
