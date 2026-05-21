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
import { Archive, MoreHorizontal, Play, Trash2, XCircle } from "lucide-react";
import {
  DATE_COLUMN_LABEL,
  ROW_ACTIONS,
  SortableColumnHeader,
  formatDate,
  getDateFieldForState,
  type RowAction,
  type SortDirection,
} from "@/components/environment/task-shared";
import type { TaskState } from "@/hooks/use-queue-detail";
import type { queue } from "../../../wailsjs/go/models";

type TaskTableProps = {
  state: TaskState;
  tasks: queue.TaskInfo[];
  sortDirection: SortDirection;
  onToggleSort: () => void;
  onTaskSelect: (task: queue.TaskInfo) => void;
  onTaskAction: (action: RowAction, taskID: string) => void;
};

// Shared task list table used by both the queue detail and the Tasks views, so
// columns, alignment and row actions stay in sync. Callers handle the empty
// state and pagination; this only renders the table for a non-empty list.
export function TaskTable({
  state,
  tasks,
  sortDirection,
  onToggleSort,
  onTaskSelect,
  onTaskAction,
}: TaskTableProps) {
  const rowActions = ROW_ACTIONS[state];
  const dateLabel = DATE_COLUMN_LABEL[state];

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-(--color-divider) hover:bg-transparent">
          <TableHead className="text-(--color-text-secondary)">ID</TableHead>
          <TableHead className="text-(--color-text-secondary)">Type</TableHead>
          <TableHead className="text-(--color-text-secondary)">Payload</TableHead>
          {dateLabel && (
            <TableHead>
              <SortableColumnHeader
                label={dateLabel}
                direction={sortDirection}
                onToggle={onToggleSort}
              />
            </TableHead>
          )}
          {state === "retry" && (
            <TableHead className="text-right text-(--color-text-secondary)">Retries</TableHead>
          )}
          {(state === "retry" || state === "archived") && (
            <TableHead className="text-(--color-text-secondary)">Last Error</TableHead>
          )}
          {state === "active" && (
            <TableHead className="text-center text-(--color-text-secondary)">Status</TableHead>
          )}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t) => (
          <TableRow
            key={t.id}
            className="border-(--color-divider) hover:bg-(--color-row-hover) cursor-pointer transition-colors"
            onClick={() => onTaskSelect(t)}
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
            {dateLabel && (
              <TableCell className="text-xs text-(--color-text-secondary)">
                {formatDate(getDateFieldForState(t, state))}
              </TableCell>
            )}
            {state === "retry" && (
              <TableCell className="text-right text-xs">
                <span className="text-(--color-warning)">
                  {t.retried}/{t.maxRetry}
                </span>
              </TableCell>
            )}
            {(state === "retry" || state === "archived") && (
              <TableCell className="max-w-32 truncate text-xs text-(--color-error)">
                {t.lastErr}
              </TableCell>
            )}
            {state === "active" && (
              <TableCell className="text-center">
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
                          onClick={() => onTaskAction(action, t.id)}
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
  );
}
