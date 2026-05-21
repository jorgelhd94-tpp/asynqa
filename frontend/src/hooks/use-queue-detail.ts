import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as QueueService from "../../wailsjs/go/queue/QueueService";

export type TaskState =
  | "pending"
  | "active"
  | "scheduled"
  | "retry"
  | "archived"
  | "completed";

export function useQueueDetail(environmentId: number, queueName: string) {
  return useQuery({
    queryKey: ["queue-detail", environmentId, queueName],
    queryFn: () => QueueService.GetQueueDetail(environmentId, queueName),
    refetchInterval: 5000,
  });
}

const taskListFns: Record<
  TaskState,
  (envId: number, queue: string, page: number, size: number, sortDir: string) => Promise<any>
> = {
  pending: QueueService.ListPendingTasks,
  active: QueueService.ListActiveTasks,
  scheduled: QueueService.ListScheduledTasks,
  retry: QueueService.ListRetryTasks,
  archived: QueueService.ListArchivedTasks,
  completed: QueueService.ListCompletedTasks,
};

export function useTaskList(
  environmentId: number,
  queueName: string,
  state: TaskState,
  page: number,
  pageSize: number,
  sortDir: string
) {
  return useQuery({
    queryKey: ["queue-tasks", environmentId, queueName, state, page, pageSize, sortDir],
    queryFn: () => taskListFns[state](environmentId, queueName, page, pageSize, sortDir),
    refetchInterval: 5000,
  });
}

function useInvalidateQueueData(environmentId: number, queueName: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: ["queue-detail", environmentId, queueName],
    });
    queryClient.invalidateQueries({
      queryKey: ["queue-tasks", environmentId, queueName],
    });
    queryClient.invalidateQueries({
      queryKey: ["queues", environmentId],
    });
    queryClient.invalidateQueries({
      queryKey: ["dashboard", environmentId],
    });
  };
}

export function useRunTask(environmentId: number, queueName: string) {
  const invalidate = useInvalidateQueueData(environmentId, queueName);
  return useMutation({
    mutationFn: (taskID: string) =>
      QueueService.RunTask(environmentId, queueName, taskID),
    onSuccess: invalidate,
  });
}

export function useDeleteTask(environmentId: number, queueName: string) {
  const invalidate = useInvalidateQueueData(environmentId, queueName);
  return useMutation({
    mutationFn: (taskID: string) =>
      QueueService.DeleteTask(environmentId, queueName, taskID),
    onSuccess: invalidate,
  });
}

export function useArchiveTask(environmentId: number, queueName: string) {
  const invalidate = useInvalidateQueueData(environmentId, queueName);
  return useMutation({
    mutationFn: (taskID: string) =>
      QueueService.ArchiveTask(environmentId, queueName, taskID),
    onSuccess: invalidate,
  });
}

export function useCancelTask(environmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskID: string) =>
      QueueService.CancelActiveTask(environmentId, taskID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue-tasks", environmentId] });
      queryClient.invalidateQueries({ queryKey: ["queue-detail", environmentId] });
    },
  });
}

export type BulkRunState = "scheduled" | "retry" | "archived";
const bulkRunFns: Record<
  BulkRunState,
  (envId: number, queue: string) => Promise<any>
> = {
  scheduled: QueueService.RunAllScheduledTasks,
  retry: QueueService.RunAllRetryTasks,
  archived: QueueService.RunAllArchivedTasks,
};

export function useBulkRunTasks(environmentId: number, queueName: string) {
  const invalidate = useInvalidateQueueData(environmentId, queueName);
  return useMutation({
    mutationFn: (state: BulkRunState) =>
      bulkRunFns[state](environmentId, queueName),
    onSuccess: invalidate,
  });
}

export type BulkArchiveState = "pending" | "scheduled" | "retry";
const bulkArchiveFns: Record<
  BulkArchiveState,
  (envId: number, queue: string) => Promise<any>
> = {
  pending: QueueService.ArchiveAllPendingTasks,
  scheduled: QueueService.ArchiveAllScheduledTasks,
  retry: QueueService.ArchiveAllRetryTasks,
};

export function useBulkArchiveTasks(environmentId: number, queueName: string) {
  const invalidate = useInvalidateQueueData(environmentId, queueName);
  return useMutation({
    mutationFn: (state: BulkArchiveState) =>
      bulkArchiveFns[state](environmentId, queueName),
    onSuccess: invalidate,
  });
}

export type BulkDeleteState =
  | "pending"
  | "scheduled"
  | "retry"
  | "archived"
  | "completed";
const bulkDeleteFns: Record<
  BulkDeleteState,
  (envId: number, queue: string) => Promise<any>
> = {
  pending: QueueService.DeleteAllPendingTasks,
  scheduled: QueueService.DeleteAllScheduledTasks,
  retry: QueueService.DeleteAllRetryTasks,
  archived: QueueService.DeleteAllArchivedTasks,
  completed: QueueService.DeleteAllCompletedTasks,
};

export function useBulkDeleteTasks(environmentId: number, queueName: string) {
  const invalidate = useInvalidateQueueData(environmentId, queueName);
  return useMutation({
    mutationFn: (state: BulkDeleteState) =>
      bulkDeleteFns[state](environmentId, queueName),
    onSuccess: invalidate,
  });
}
