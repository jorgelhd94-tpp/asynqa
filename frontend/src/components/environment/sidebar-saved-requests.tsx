import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
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
  useSavedRequests,
  useRenameSavedRequest,
  useCreateSavedRequest,
  useDeleteSavedRequest,
} from "@/hooks/use-task-runner";
import { Copy, MoreHorizontal, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { taskrunner } from "../../../wailsjs/go/models";
import { clearDraft, hasDraft, DRAFT_CHANGE_EVENT } from "@/lib/task-runner-draft";

type SidebarSavedRequestsProps = {
  environmentId: number;
  newDialogOpen?: boolean;
  onNewDialogClose?: () => void;
  onNewRequest?: () => void;
};

export function SidebarSavedRequests({ environmentId, newDialogOpen, onNewDialogClose, onNewRequest }: SidebarSavedRequestsProps) {
  const id = String(environmentId);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: requests = [] } = useSavedRequests(environmentId);
  const renameMutation = useRenameSavedRequest(environmentId);
  const createMutation = useCreateSavedRequest(environmentId);
  const deleteMutation = useDeleteSavedRequest(environmentId);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [cloneValue, setCloneValue] = useState("");
  const [newName, setNewName] = useState("New Request");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [draftIds, setDraftIds] = useState<Set<number>>(new Set());
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Reflect which saved requests currently have an unsaved draft. localStorage
  // isn't reactive, so we recompute when the request list changes and whenever
  // the form signals a draft was written or cleared.
  useEffect(() => {
    const recompute = () => {
      setDraftIds((prev) => {
        const next = new Set<number>();
        for (const req of requests) {
          if (hasDraft(environmentId, req.id)) next.add(req.id);
        }
        if (prev.size === next.size && [...next].every((id) => prev.has(id))) {
          return prev;
        }
        return next;
      });
    };
    recompute();
    window.addEventListener(DRAFT_CHANGE_EVENT, recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener(DRAFT_CHANGE_EVENT, recompute);
      window.removeEventListener("storage", recompute);
    };
  }, [environmentId, requests]);
  const cloneInputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      requestAnimationFrame(() => {
        node.focus();
        node.select();
      });
    }
  }, []);

  useEffect(() => {
    if (renamingId !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const isActive = (requestId: number) => {
    return location.pathname === `/environment/${id}/task-runner/${requestId}`;
  };

  const handleStartRename = (requestId: number, currentName: string) => {
    setRenamingId(requestId);
    setRenameValue(currentName);
  };

  const handleConfirmRename = () => {
    if (renamingId !== null && renameValue.trim()) {
      renameMutation.mutate({
        requestId: renamingId,
        input: new taskrunner.RenameSavedRequestInput({ name: renameValue.trim() }),
      });
    }
    setRenamingId(null);
  };

  const handleStartClone = (req: (typeof requests)[number]) => {
    setCloningId(req.id);
    setCloneValue(req.name + " (copy)");
  };

  const handleConfirmClone = () => {
    if (cloningId === null || !cloneValue.trim()) {
      setCloningId(null);
      return;
    }
    const original = requests.find((r) => r.id === cloningId);
    if (!original) {
      setCloningId(null);
      return;
    }
    const input = new taskrunner.CreateSavedRequestInput({
      name: cloneValue.trim(),
      queue: original.queue,
      taskType: original.taskType,
      payload: original.payload,
      maxRetry: original.maxRetry,
      timeoutSecs: original.timeoutSecs,
      delaySecs: original.delaySecs,
    });
    createMutation.mutate(input, {
      onSuccess: (cloned) => {
        navigate({
          to: "/environment/$id/task-runner/$requestId",
          params: { id, requestId: String(cloned.id) },
        });
      },
    });
    setCloningId(null);
  };

  const handleConfirmNew = () => {
    if (!newName.trim()) return;
    const input = new taskrunner.CreateSavedRequestInput({
      name: newName.trim(),
      queue: "default",
      taskType: "",
      payload: "{\n  \n}",
      maxRetry: 0,
      timeoutSecs: 0,
      delaySecs: 0,
    });
    createMutation.mutate(input, {
      onSuccess: (saved) => {
        navigate({
          to: "/environment/$id/task-runner/$requestId",
          params: { id, requestId: String(saved.id) },
        });
      },
    });
    onNewDialogClose?.();
    setNewName("New Request");
  };

  const handleConfirmDelete = () => {
    if (deleteId === null) return;

    const wasActive = isActive(deleteId);
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        clearDraft(environmentId, deleteId);
        if (wasActive) {
          const remaining = requests.filter((r) => r.id !== deleteId);
          if (remaining.length > 0) {
            navigate({
              to: "/environment/$id/task-runner/$requestId",
              params: { id, requestId: String(remaining[0].id) },
            });
          } else {
            navigate({
              to: "/environment/$id/dashboard",
              params: { id },
            });
          }
        }
      },
    });
    setDeleteId(null);
  };

  return (
    <>
      {requests.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center group-data-[collapsible=icon]:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-row-hover)">
            <Send className="h-4 w-4 text-(--color-text-muted)" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-(--color-text-secondary)">
              No saved requests yet
            </p>
            <p className="text-[11px] leading-relaxed text-(--color-text-muted)">
              Compose a task, send it to a queue, and save it here to reuse later.
            </p>
          </div>
          <button
            onClick={onNewRequest}
            className="inline-flex items-center gap-1.5 rounded-md border border-(--color-divider) px-2.5 py-1.5 text-xs text-(--color-text-secondary) transition-colors hover:bg-(--color-row-hover) hover:text-(--color-text-primary)"
          >
            <Plus className="h-3.5 w-3.5" />
            New Request
          </button>
        </div>
      )}

      {requests.length > 0 && <SidebarMenu>
        {requests.map((req) => (
          <SidebarMenuItem key={req.id}>
            {renamingId === req.id ? (
              <div className="px-2 py-1">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleConfirmRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="h-7 w-full rounded border border-(--color-accent-val) bg-[--color-primary-bg] px-2 text-xs text-[--color-text-primary] outline-none"
                />
              </div>
            ) : (
              <>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(req.id)}
                  tooltip={req.name}
                  size="sm"
                >
                  <Link
                    to="/environment/$id/task-runner/$requestId"
                    params={{ id, requestId: String(req.id) }}
                  >
                    <Send className="h-3 w-3" />
                    <span className="truncate" title={req.name}>{req.name}</span>
                    {draftIds.has(req.id) && (
                      <span
                        className="ml-auto flex items-center gap-1 shrink-0 text-[9px] font-medium text-(--color-accent-val)"
                        title="Unsaved draft"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-(--color-accent-val)" />
                        Draft
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" sideOffset={4}>
                    <DropdownMenuItem
                      onClick={() => handleStartRename(req.id, req.name)}
                      className="gap-2 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStartClone(req)}
                      className="gap-2 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Clone
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteId(req.id)}
                      className="gap-2 text-xs text-[--color-error] focus:text-[--color-error]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>}

      <AlertDialog
        open={!!newDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            onNewDialogClose?.();
            setNewName("New Request");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New Request</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the new request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            ref={cloneInputCallbackRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) handleConfirmNew();
            }}
            className="h-9 w-full rounded-lg border border-[--color-divider] bg-[--color-primary-bg] px-3 text-sm text-[--color-text-primary] outline-none focus:border-(--color-accent-val) transition-colors"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmNew}
              disabled={!newName.trim()}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cloningId !== null} onOpenChange={(open) => !open && setCloningId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clone Request</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the cloned request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            ref={cloneInputCallbackRef}
            value={cloneValue}
            onChange={(e) => setCloneValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && cloneValue.trim()) handleConfirmClone();
            }}
            className="h-9 w-full rounded-lg border border-[--color-divider] bg-[--color-primary-bg] px-3 text-sm text-[--color-text-primary] outline-none focus:border-(--color-accent-val) transition-colors"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClone}
              disabled={!cloneValue.trim()}
            >
              Clone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this saved request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-[--color-error] hover:bg-[--color-error]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
