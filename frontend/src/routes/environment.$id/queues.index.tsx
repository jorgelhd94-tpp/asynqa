import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/environment/page-header";
import { StatCard } from "@/components/environment/stat-card";
import { RefreshIndicator } from "@/components/environment/refresh-indicator";
import { ErrorState } from "@/components/environment/error-state";
import {
  useQueues,
  usePauseQueue,
  useUnpauseQueue,
  useDeleteQueue,
} from "@/hooks/use-queues";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Activity,
  Layers,
  ListTodo,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { sileo } from "sileo";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/environment/$id/queues/")({
  component: QueuesPage,
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function QueuesPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const environmentId = Number(id);
  const { data, isLoading, isError, error, dataUpdatedAt, isFetching, refetch } = useQueues(environmentId);
  const pauseMutation = usePauseQueue(environmentId);
  const unpauseMutation = useUnpauseQueue(environmentId);
  const deleteMutation = useDeleteQueue(environmentId);

  const [deleteTarget, setDeleteTarget] = useState<{
    name: string;
    size: number;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <PageHeader title="Queues" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded" />
          ))}
        </div>
        <Skeleton className="h-64 rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 space-y-4">
        <PageHeader title="Queues" />
        <ErrorState
          title="Failed to load queue data"
          error={error}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const queues = data?.queues ?? [];

  const handleTogglePause = (queueName: string, paused: boolean) => {
    if (paused) {
      unpauseMutation.mutate(queueName, {
        onSuccess: () => sileo.success({ title: `Queue "${queueName}" resumed` }),
        onError: (err) => sileo.error({ title: `Failed to resume queue: ${getErrorMessage(err)}` }),
      });
    } else {
      pauseMutation.mutate(queueName, {
        onSuccess: () => sileo.success({ title: `Queue "${queueName}" paused` }),
        onError: (err) => sileo.error({ title: `Failed to pause queue: ${getErrorMessage(err)}` }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { queueName: deleteTarget.name, force: deleteTarget.size > 0 },
      {
        onSuccess: () => {
          sileo.success({ title: `Queue "${deleteTarget.name}" deleted` });
          setDeleteTarget(null);
        },
        onError: (err) => {
          sileo.error({ title: `Failed to delete queue: ${getErrorMessage(err)}` });
          setDeleteTarget(null);
        },
      }
    );
  };

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Queues"
        actions={
          <RefreshIndicator intervalMs={5000} dataUpdatedAt={dataUpdatedAt} onRefresh={refetch} isFetching={isFetching} />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Queues"
          value={data?.totalQueues ?? 0}
          icon={Layers}
        />
        <StatCard
          title="Total Tasks"
          value={(data?.totalTasks ?? 0).toLocaleString()}
          icon={ListTodo}
          iconColor="text-(--color-warning)"
        />
        <StatCard
          title="Active"
          value={data?.activeQueues ?? 0}
          subtitle="processing"
          icon={Play}
          iconColor="text-(--color-success)"
        />
        <StatCard
          title="Paused"
          value={data?.pausedQueues ?? 0}
          icon={Pause}
          iconColor="text-(--color-warning)"
        />
      </div>

      {queues.length > 0 && (
        <div className="rounded border border-(--color-divider) bg-(--color-primary-light)">
          <div className="flex items-center gap-2 border-b border-(--color-divider) px-4 py-3">
            <Activity className="h-4 w-4 text-(--color-accent-val)" />
            <h2 className="text-sm font-semibold text-(--color-text-primary)">
              All Queues
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-(--color-divider) hover:bg-transparent">
                <TableHead className="text-(--color-text-secondary)">Queue</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Size</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Pending</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Active</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Scheduled</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Retry</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Archived</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Processed</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Failed</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Latency</TableHead>
                <TableHead className="text-right text-(--color-text-secondary)">Memory</TableHead>
                <TableHead className="text-center text-(--color-text-secondary)">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((q) => (
                <TableRow
                  key={q.queue}
                  className="border-(--color-divider) hover:bg-(--color-row-hover) cursor-pointer transition-colors"
                  onClick={() =>
                    navigate({
                      to: "/environment/$id/queues/$queueName",
                      params: { id, queueName: q.queue },
                    })
                  }
                >
                  <TableCell className="font-medium text-(--color-text-primary)">
                    {q.queue}
                  </TableCell>
                  <TableCell className="text-right text-(--color-text-secondary)">
                    {q.size}
                  </TableCell>
                  <TableCell className="text-right text-(--color-text-secondary)">
                    {q.pending}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={q.active > 0 ? "text-(--color-success)" : "text-(--color-text-secondary)"}>
                      {q.active}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-(--color-text-secondary)">
                    {q.scheduled}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={q.retry > 0 ? "text-(--color-warning)" : "text-(--color-text-secondary)"}>
                      {q.retry}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={q.archived > 0 ? "text-(--color-error)" : "text-(--color-text-secondary)"}>
                      {q.archived}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-(--color-text-secondary)">
                    {q.processedTotal.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={q.failedTotal > 0 ? "text-(--color-error)" : "text-(--color-text-secondary)"}>
                      {q.failedTotal.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-(--color-text-secondary)">
                    {q.latencyMs}ms
                  </TableCell>
                  <TableCell className="text-right text-(--color-text-secondary)">
                    {formatBytes(q.memoryUsage)}
                  </TableCell>
                  <TableCell className="text-center">
                    {q.paused ? (
                      <Badge variant="outline" className="border-(--color-warning) text-(--color-warning)">
                        Paused
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-(--color-success) text-(--color-success)">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" className="text-(--color-text-secondary) hover:text-(--color-text-primary)">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleTogglePause(q.queue, q.paused)}
                        >
                          {q.paused ? (
                            <>
                              <Play className="h-4 w-4" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4" />
                              Pause
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            setDeleteTarget({ name: q.queue, size: q.size })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {queues.length === 0 && (
        <div className="flex items-center justify-center rounded border border-dashed border-(--color-divider) py-16 text-sm text-(--color-text-secondary)">
          <div className="text-center">
            <Layers className="mx-auto mb-2 h-8 w-8 text-(--color-text-muted)" />
            <p>No queues found in this environment.</p>
            <p className="mt-1 text-xs">Start an asynq worker to create queues.</p>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete queue &ldquo;{deleteTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.size > 0
                ? `This queue has ${deleteTarget.size} task(s). All tasks will be permanently deleted. This action cannot be undone.`
                : "This empty queue will be permanently deleted. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
