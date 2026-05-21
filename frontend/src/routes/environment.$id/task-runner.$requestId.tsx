import { createFileRoute } from "@tanstack/react-router";
import { useSavedRequest, useUpdateSavedRequest } from "@/hooks/use-task-runner";
import { TaskRunnerForm, type TaskRunnerFormValues } from "@/components/task-runner/task-runner-form";
import { Skeleton } from "@/components/ui/skeleton";
import { taskrunner } from "../../../wailsjs/go/models";
import { useMemo } from "react";

export const Route = createFileRoute("/environment/$id/task-runner/$requestId")({
  component: SavedRequestPage,
});

function SavedRequestPage() {
  const { id, requestId } = Route.useParams();
  const environmentId = Number(id);
  const numericRequestId = Number(requestId);
  const { data: savedRequest, isLoading } = useSavedRequest(numericRequestId);
  const updateMutation = useUpdateSavedRequest(environmentId);

  const initialValues: TaskRunnerFormValues | undefined = useMemo(() => {
    if (!savedRequest) return undefined;
    return {
      queue: savedRequest.queue || "default",
      taskType: savedRequest.taskType || "",
      payload: savedRequest.payload || "{\n  \n}",
      maxRetry: savedRequest.maxRetry ? String(savedRequest.maxRetry) : "",
      timeoutSecs: savedRequest.timeoutSecs ? String(savedRequest.timeoutSecs) : "",
      delaySecs: savedRequest.delaySecs ? String(savedRequest.delaySecs) : "",
    };
  }, [savedRequest]);

  const handleSave = (values: TaskRunnerFormValues) => {
    const input = new taskrunner.UpdateSavedRequestInput({
      name: savedRequest?.name ?? "Request",
      queue: values.queue,
      taskType: values.taskType,
      payload: values.payload,
      maxRetry: values.maxRetry ? parseInt(values.maxRetry, 10) : 0,
      timeoutSecs: values.timeoutSecs ? parseInt(values.timeoutSecs, 10) : 0,
      delaySecs: values.delaySecs ? parseInt(values.delaySecs, 10) : 0,
    });

    updateMutation.mutate({ requestId: numericRequestId, input });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!savedRequest) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[--color-text-muted]">Request not found</p>
      </div>
    );
  }

  return (
    <TaskRunnerForm
      environmentId={environmentId}
      requestId={numericRequestId}
      initialValues={initialValues}
      onSave={handleSave}
      isSaving={updateMutation.isPending}
      savedRequestName={savedRequest.name}
    />
  );
}
