import { useEffect, useRef, useState } from "react";
import { useEnqueueTask } from "@/hooks/use-task-runner";
import { useQueues } from "@/hooks/use-queues";
import { useClipboard } from "@/hooks/use-clipboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JsonEditor } from "@/components/task-runner/json-editor";
import { CodeBlock } from "@/components/environment/code-block";
import { getErrorMessage } from "@/lib/errors";
import { loadDraft, saveDraft, clearDraft } from "@/lib/task-runner-draft";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  AlertTriangle,
  Braces,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Zap,
} from "lucide-react";
import { taskrunner } from "../../../wailsjs/go/models";

export type TaskRunnerFormValues = {
  queue: string;
  taskType: string;
  payload: string;
  maxRetry: string;
  timeoutSecs: string;
  delaySecs: string;
};

type TaskRunnerFormProps = {
  environmentId: number;
  requestId: number;
  initialValues?: TaskRunnerFormValues;
  onSave?: (values: TaskRunnerFormValues) => void;
  isSaving?: boolean;
  savedRequestName?: string;
};

export function TaskRunnerForm({
  environmentId,
  requestId,
  initialValues,
  onSave,
  isSaving,
  savedRequestName,
}: TaskRunnerFormProps) {
  const { data: queuesData, isLoading: queuesLoading } = useQueues(environmentId);
  const enqueueMutation = useEnqueueTask(environmentId);
  const { copy: copyTaskId, copied: taskIdCopied } = useClipboard();

  const queueNames = (queuesData?.queues ?? []).map((q) => q.queue);

  const [queue, setQueue] = useState(initialValues?.queue ?? "default");
  const [taskType, setTaskType] = useState(initialValues?.taskType ?? "");
  const [payload, setPayload] = useState(initialValues?.payload ?? "{\n  \n}");
  const [maxRetry, setMaxRetry] = useState(initialValues?.maxRetry ?? "");
  const [timeoutSecs, setTimeoutSecs] = useState(initialValues?.timeoutSecs ?? "");
  const [delaySecs, setDelaySecs] = useState(initialValues?.delaySecs ?? "");
  const [activeTab, setActiveTab] = useState("body");

  // Hydrate the form once per request: a locally saved draft (unsaved edits
  // from a previous visit) takes precedence over the persisted saved request.
  const hydratedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!initialValues) return;
    if (hydratedFor.current === requestId) return;

    const draft = loadDraft(environmentId, requestId);
    const init = draft ?? initialValues;
    setQueue(init.queue);
    setTaskType(init.taskType);
    setPayload(init.payload);
    setMaxRetry(init.maxRetry);
    setTimeoutSecs(init.timeoutSecs);
    setDelaySecs(init.delaySecs);
    hydratedFor.current = requestId;
  }, [initialValues, environmentId, requestId]);

  const currentValues: TaskRunnerFormValues = {
    queue,
    taskType,
    payload,
    maxRetry,
    timeoutSecs,
    delaySecs,
  };

  const hasUnsavedChanges =
    onSave != null &&
    initialValues != null &&
    JSON.stringify(currentValues) !== JSON.stringify(initialValues);

  // Mirror the draft to localStorage while there are unsaved edits, and remove
  // it once the form matches the saved request (e.g. after saving or
  // discarding). Debounced to avoid writing on every keystroke.
  useEffect(() => {
    if (onSave == null) return;
    if (hydratedFor.current !== requestId) return;
    const handle = setTimeout(() => {
      if (hasUnsavedChanges) {
        saveDraft(environmentId, requestId, currentValues);
      } else {
        clearDraft(environmentId, requestId);
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentId, requestId, hasUnsavedChanges, queue, taskType, payload, maxRetry, timeoutSecs, delaySecs]);

  const handleSubmit = () => {
    if (!taskType.trim()) return;

    const request = new taskrunner.EnqueueRequest({
      queue: queue.trim() || "default",
      taskType: taskType.trim(),
      payload: payload.trim() || "{}",
      maxRetry: maxRetry ? parseInt(maxRetry, 10) : 0,
      timeoutSecs: timeoutSecs ? parseInt(timeoutSecs, 10) : 0,
      delaySecs: delaySecs ? parseInt(delaySecs, 10) : 0,
    });

    enqueueMutation.mutate(request);
  };

  const handleReset = () => {
    if (initialValues) {
      setQueue(initialValues.queue);
      setTaskType(initialValues.taskType);
      setPayload(initialValues.payload);
      setMaxRetry(initialValues.maxRetry);
      setTimeoutSecs(initialValues.timeoutSecs);
      setDelaySecs(initialValues.delaySecs);
    } else {
      setQueue("default");
      setTaskType("");
      setPayload("{\n  \n}");
      setMaxRetry("");
      setTimeoutSecs("");
      setDelaySecs("");
    }
    enqueueMutation.reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (onSave && hasUnsavedChanges) {
        onSave(currentValues);
      }
    }
  };

  const handleCopyTaskId = () => {
    if (enqueueMutation.data?.taskID) {
      copyTaskId(enqueueMutation.data.taskID);
    }
  };

  return (
    <div data-full-bleed className="flex h-full flex-col" onKeyDown={handleKeyDown}>
      {/* Top bar - Queue + Task Type + Send */}
      <div className="flex items-center gap-0 border-b border-[--color-divider] bg-[--color-primary-bg]">
        {/* Queue selector */}
        <div className="flex items-center border-r border-[--color-divider] pr-2">
          {queuesLoading ? (
            <Skeleton className="m-2 h-8 w-28 rounded-md" />
          ) : (
            <select
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
              className="h-11 border-none bg-transparent px-4 text-xs font-semibold text-(--color-accent-light) outline-none cursor-pointer"
            >
              <option value="default">default</option>
              {queueNames
                .filter((q) => q !== "default")
                .map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
            </select>
          )}
        </div>

        {/* Task type input */}
        <div className="flex flex-1 items-center">
          <input
            type="text"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            placeholder="Enter task type... e.g. email:send, user:sync"
            className="h-11 flex-1 border-none bg-transparent px-4 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] outline-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 px-3">
          {onSave && (
            <Button
              onClick={() => onSave(currentValues)}
              disabled={!hasUnsavedChanges || isSaving}
              variant="outline"
              size="sm"
              className="gap-2 border-[--color-divider] text-[--color-text-secondary] hover:text-[--color-text-primary]"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!taskType.trim() || enqueueMutation.isPending}
            className="bg-(--color-accent-val) hover:bg-(--color-accent-dark) text-white font-semibold gap-2 px-5"
            size="sm"
          >
            <Send className="h-3.5 w-3.5" />
            {enqueueMutation.isPending ? "Sending..." : "Send"}
          </Button>
          <span className="hidden text-[10px] text-[--color-text-muted] lg:block">Ctrl+Enter</span>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 border-b border-(--color-accent-val)/20 bg-(--color-accent-val)/5 px-4 py-1.5">
          <span className="text-[10px] text-(--color-accent-val)">
            Unsaved changes{savedRequestName ? ` in "${savedRequestName}"` : ""} — kept as a draft, Ctrl+S to save
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="ml-auto text-[10px] text-(--color-text-muted) underline-offset-2 hover:text-(--color-text-secondary) hover:underline"
          >
            Discard
          </button>
        </div>
      )}

      {/* Main content area */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        {/* Left panel - Editor */}
        <ResizablePanel defaultSize={60} minSize={30} className="flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
            <div className="border-b border-[--color-divider]">
              <TabsList className="h-auto bg-transparent p-0 px-2">
                <TabsTrigger
                  value="body"
                  className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-(--color-accent-val) data-[state=active]:bg-transparent data-[state=active]:text-(--color-accent-val)"
                >
                  <Zap className="h-3 w-3" />
                  Body
                </TabsTrigger>
                <TabsTrigger
                  value="options"
                  className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-(--color-accent-val) data-[state=active]:bg-transparent data-[state=active]:text-(--color-accent-val)"
                >
                  <Settings2 className="h-3 w-3" />
                  Options
                  {(maxRetry || timeoutSecs || delaySecs) && (
                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-accent-val)/20 text-[9px] text-(--color-accent-val)">
                      {[maxRetry, timeoutSecs, delaySecs].filter(Boolean).length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="body" className="relative mt-0 flex-1 overflow-hidden">
              <div className="absolute inset-0 flex flex-col">
                <div className="relative z-10 flex items-center justify-between border-b border-[--color-divider]/50 px-4 py-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[--color-text-muted]">
                    JSON Payload
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        try {
                          setPayload(JSON.stringify(JSON.parse(payload), null, 2));
                        } catch {
                          // invalid JSON — do nothing
                        }
                      }}
                      className="h-6 text-[10px] text-[--color-text-secondary] hover:text-[--color-text-primary]"
                    >
                      <Braces className="h-2.5 w-2.5" />
                      Prettify
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleReset}
                      className="h-6 text-[10px] text-[--color-text-secondary] hover:text-[--color-text-primary]"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      {initialValues ? "Reset" : "Clear"}
                    </Button>
                  </div>
                </div>
                <JsonEditor key={requestId} value={payload} onChange={setPayload} />
              </div>
            </TabsContent>

            <TabsContent value="options" className="mt-0 flex-1 p-4">
              <div className="space-y-5">
                <p className="text-xs text-[--color-text-secondary]">
                  Configure task processing options. Leave empty for defaults.
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[--color-text-secondary]">
                      <RefreshCw className="h-3 w-3 text-[--color-text-muted]" />
                      Max Retry
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={maxRetry}
                      onChange={(e) => setMaxRetry(e.target.value)}
                      placeholder="Default (25)"
                      className="h-9 w-full rounded-lg border border-[--color-divider] bg-[--color-primary-bg] px-3 text-xs text-[--color-text-primary] placeholder:text-[--color-text-muted] outline-none focus:border-(--color-accent-val) transition-colors"
                    />
                    <span className="text-[10px] text-[--color-text-muted]">
                      Times to retry on failure
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[--color-text-secondary]">
                      <Clock className="h-3 w-3 text-[--color-text-muted]" />
                      Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={timeoutSecs}
                      onChange={(e) => setTimeoutSecs(e.target.value)}
                      placeholder="Default (1800)"
                      className="h-9 w-full rounded-lg border border-[--color-divider] bg-[--color-primary-bg] px-3 text-xs text-[--color-text-primary] placeholder:text-[--color-text-muted] outline-none focus:border-(--color-accent-val) transition-colors"
                    />
                    <span className="text-[10px] text-[--color-text-muted]">
                      Max processing time
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[--color-text-secondary]">
                      <Zap className="h-3 w-3 text-[--color-text-muted]" />
                      Delay (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={delaySecs}
                      onChange={(e) => setDelaySecs(e.target.value)}
                      placeholder="0 (immediate)"
                      className="h-9 w-full rounded-lg border border-[--color-divider] bg-[--color-primary-bg] px-3 text-xs text-[--color-text-primary] placeholder:text-[--color-text-muted] outline-none focus:border-(--color-accent-val) transition-colors"
                    />
                    <span className="text-[10px] text-[--color-text-muted]">
                      Seconds before processing
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle className="w-px! bg-[--color-divider-dark]! hover:bg-[--color-accent-val]! hover:w-1! transition-all cursor-col-resize after:hidden!" />

        {/* Right panel - Response */}
        <ResizablePanel defaultSize={40} minSize={20} className="flex flex-col">
          <div className="flex h-[37px] shrink-0 items-center gap-2 border-b border-[--color-divider] px-4">
            <span className="text-xs font-semibold text-[--color-text-primary]">Response</span>
            {enqueueMutation.isSuccess && (
              <Badge variant="outline" className="border-[--color-success] text-[--color-success] text-[10px]">
                200 OK
              </Badge>
            )}
            {enqueueMutation.isError && (
              <Badge variant="outline" className="border-[--color-error] text-[--color-error] text-[10px]">
                Error
              </Badge>
            )}
          </div>

          <div className="flex flex-1 flex-col">
            {enqueueMutation.isIdle && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[--color-primary-light]">
                  <Send className="h-7 w-7 text-[--color-text-muted]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[--color-text-secondary]">Send Request</p>
                  <p className="mt-1 text-xs text-[--color-text-muted]">
                    Enter a task type and click Send
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <Shortcut label="Send Request" keys="Ctrl + Enter" />
                  {onSave && <Shortcut label="Save Changes" keys="Ctrl + S" />}
                </div>
              </div>
            )}

            {enqueueMutation.isPending && (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="space-y-3 text-center">
                  <div className="mx-auto flex h-10 w-10 animate-pulse items-center justify-center rounded bg-(--color-accent-val)/10">
                    <Send className="h-5 w-5 text-(--color-accent-val)" />
                  </div>
                  <p className="text-xs text-[--color-text-secondary]">Enqueuing task...</p>
                </div>
              </div>
            )}

            {enqueueMutation.isSuccess && (
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2 rounded-lg border border-(--color-accent-val)/20 bg-(--color-accent-val)/5 p-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[--color-success]" />
                  <span className="text-xs font-medium text-[--color-success]">Task enqueued successfully</span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[--color-text-muted]">
                      Task ID
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleCopyTaskId}
                      className={`h-5 text-[10px] transition-colors ${taskIdCopied ? "text-(--color-accent-light)" : "text-[--color-text-secondary] hover:text-[--color-text-primary]"}`}
                    >
                      {taskIdCopied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                      {taskIdCopied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <pre className="rounded-lg border border-[--color-divider] bg-[--color-primary-contrast] p-3 font-mono text-xs text-(--color-accent-val) select-all">
                    {enqueueMutation.data.taskID}
                  </pre>
                </div>

                <div className="mt-4">
                  <CodeBlock
                    label="Details"
                    content={JSON.stringify(
                      {
                        taskID: enqueueMutation.data.taskID,
                        queue: queue.trim() || "default",
                        type: taskType.trim(),
                        status: "enqueued",
                      },
                      null,
                      2
                    )}
                    variant="success"
                  />
                </div>
              </div>
            )}

            {enqueueMutation.isError && (
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2 rounded-lg border border-[--color-error]/20 bg-[--color-error]/5 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[--color-error]" />
                  <span className="text-xs font-medium text-[--color-error]">
                    Failed to enqueue task
                  </span>
                </div>

                <div className="mt-4">
                  <CodeBlock
                    label="Error"
                    content={getErrorMessage(enqueueMutation.error)}
                    variant="error"
                  />
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function Shortcut({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[--color-text-muted]">
      <span className="text-[10px]">{label}</span>
      <kbd className="rounded border border-[--color-divider] bg-[--color-primary-light] px-1.5 py-0.5 font-mono text-[9px] text-[--color-text-secondary]">
        {keys}
      </kbd>
    </div>
  );
}
