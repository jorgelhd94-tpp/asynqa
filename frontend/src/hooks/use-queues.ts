import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as QueueService from "../../wailsjs/go/queue/QueueService";
import type { queue } from "../../wailsjs/go/models";

export function useQueues(environmentId: number) {
  return useQuery({
    queryKey: ["queues", environmentId],
    queryFn: () => QueueService.GetQueues(environmentId),
    refetchInterval: 5000,
  });
}

export function usePauseQueue(environmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) =>
      QueueService.PauseQueue(environmentId, queueName),
    onMutate: async (queueName) => {
      await queryClient.cancelQueries({ queryKey: ["queues", environmentId] });
      await queryClient.cancelQueries({
        queryKey: ["queue-detail", environmentId, queueName],
      });

      const previousQueues = queryClient.getQueryData(["queues", environmentId]);
      const previousDetail = queryClient.getQueryData([
        "queue-detail",
        environmentId,
        queueName,
      ]);

      queryClient.setQueryData(["queues", environmentId], (old?: queue.QueuesData) => {
        if (!old) return old;
        return {
          ...old,
          activeQueues: old.activeQueues - 1,
          pausedQueues: old.pausedQueues + 1,
          queues: old.queues.map((q) =>
            q.queue === queueName ? { ...q, paused: true } : q
          ),
        };
      });

      queryClient.setQueryData(
        ["queue-detail", environmentId, queueName],
        (old?: queue.QueueDetailData) => {
          if (!old) return old;
          return { ...old, info: { ...old.info, paused: true } };
        }
      );

      return { previousQueues, previousDetail, queueName };
    },
    onError: (_err, _queueName, context) => {
      if (context?.previousQueues) {
        queryClient.setQueryData(
          ["queues", environmentId],
          context.previousQueues
        );
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          ["queue-detail", environmentId, context.queueName],
          context.previousDetail
        );
      }
    },
    onSettled: (_data, _err, queueName) => {
      queryClient.invalidateQueries({ queryKey: ["queues", environmentId] });
      queryClient.invalidateQueries({
        queryKey: ["queue-detail", environmentId, queueName],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", environmentId],
      });
    },
  });
}

export function useUnpauseQueue(environmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) =>
      QueueService.UnpauseQueue(environmentId, queueName),
    onMutate: async (queueName) => {
      await queryClient.cancelQueries({ queryKey: ["queues", environmentId] });
      await queryClient.cancelQueries({
        queryKey: ["queue-detail", environmentId, queueName],
      });

      const previousQueues = queryClient.getQueryData(["queues", environmentId]);
      const previousDetail = queryClient.getQueryData([
        "queue-detail",
        environmentId,
        queueName,
      ]);

      queryClient.setQueryData(["queues", environmentId], (old?: queue.QueuesData) => {
        if (!old) return old;
        return {
          ...old,
          activeQueues: old.activeQueues + 1,
          pausedQueues: old.pausedQueues - 1,
          queues: old.queues.map((q) =>
            q.queue === queueName ? { ...q, paused: false } : q
          ),
        };
      });

      queryClient.setQueryData(
        ["queue-detail", environmentId, queueName],
        (old?: queue.QueueDetailData) => {
          if (!old) return old;
          return { ...old, info: { ...old.info, paused: false } };
        }
      );

      return { previousQueues, previousDetail, queueName };
    },
    onError: (_err, _queueName, context) => {
      if (context?.previousQueues) {
        queryClient.setQueryData(
          ["queues", environmentId],
          context.previousQueues
        );
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          ["queue-detail", environmentId, context.queueName],
          context.previousDetail
        );
      }
    },
    onSettled: (_data, _err, queueName) => {
      queryClient.invalidateQueries({ queryKey: ["queues", environmentId] });
      queryClient.invalidateQueries({
        queryKey: ["queue-detail", environmentId, queueName],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", environmentId],
      });
    },
  });
}

export function useDeleteQueue(environmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ queueName, force }: { queueName: string; force: boolean }) =>
      QueueService.DeleteQueue(environmentId, queueName, force),
    onMutate: async ({ queueName }) => {
      await queryClient.cancelQueries({ queryKey: ["queues", environmentId] });

      const previousQueues = queryClient.getQueryData(["queues", environmentId]);

      queryClient.setQueryData(["queues", environmentId], (old?: queue.QueuesData) => {
        if (!old) return old;
        const deleted = old.queues.find((q) => q.queue === queueName);
        return {
          ...old,
          totalQueues: old.totalQueues - 1,
          activeQueues: deleted?.paused
            ? old.activeQueues
            : old.activeQueues - 1,
          pausedQueues: deleted?.paused
            ? old.pausedQueues - 1
            : old.pausedQueues,
          totalTasks: old.totalTasks - (deleted?.size ?? 0),
          queues: old.queues.filter((q) => q.queue !== queueName),
        };
      });

      return { previousQueues };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueues) {
        queryClient.setQueryData(
          ["queues", environmentId],
          context.previousQueues
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["queues", environmentId] });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", environmentId],
      });
    },
  });
}
