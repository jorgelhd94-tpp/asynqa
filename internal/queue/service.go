package queue

import (
	"fmt"
	"sort"
	"time"

	"github.com/hibiken/asynq"
	env "github.com/jorgelhd94/asynqa/internal/environment"
	"github.com/jorgelhd94/asynqa/internal/shared"
)

// taskSortLimit caps how many tasks are fetched from Redis to be globally
// sorted before paginating. Sorting an arbitrary column requires the whole
// set, so we bound it to protect performance on very large queues; the
// frontend shows a notice when a queue exceeds this.
const taskSortLimit = 1000

type QueueService struct {
	environmentStore *env.EnvironmentStore
}

func NewQueueService(environmentStore *env.EnvironmentStore) *QueueService {
	return &QueueService{environmentStore: environmentStore}
}

func (s *QueueService) newInspector(environmentID uint) (*asynq.Inspector, error) {
	env, err := s.environmentStore.FindByID(environmentID)
	if err != nil {
		return nil, fmt.Errorf("environment not found: %w", err)
	}
	return asynq.NewInspector(shared.NewRedisOpts(env)), nil
}

func mapQueueInfo(info *asynq.QueueInfo) QueueInfo {
	return QueueInfo{
		Queue:          info.Queue,
		Size:           info.Size,
		Pending:        info.Pending,
		Active:         info.Active,
		Scheduled:      info.Scheduled,
		Retry:          info.Retry,
		Archived:       info.Archived,
		Completed:      info.Completed,
		Processed:      info.Processed,
		Failed:         info.Failed,
		ProcessedTotal: info.ProcessedTotal,
		FailedTotal:    info.FailedTotal,
		LatencyMs:      info.Latency.Milliseconds(),
		MemoryUsage:    info.MemoryUsage,
		Paused:         info.Paused,
	}
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(time.RFC3339)
}

func mapTaskInfo(t *asynq.TaskInfo) TaskInfo {
	return TaskInfo{
		ID:            t.ID,
		Queue:         t.Queue,
		Type:          t.Type,
		Payload:       string(t.Payload),
		State:         t.State.String(),
		MaxRetry:      t.MaxRetry,
		Retried:       t.Retried,
		LastErr:       t.LastErr,
		LastFailedAt:  formatTime(t.LastFailedAt),
		NextProcessAt: formatTime(t.NextProcessAt),
		TimeoutSecs:   int64(t.Timeout.Seconds()),
		RetentionSecs: int64(t.Retention.Seconds()),
		Deadline:      formatTime(t.Deadline),
		CompletedAt:   formatTime(t.CompletedAt),
		Group:         t.Group,
		Result:        string(t.Result),
		IsOrphaned:    t.IsOrphaned,
	}
}

func mapTaskInfoList(tasks []*asynq.TaskInfo) []TaskInfo {
	result := make([]TaskInfo, 0, len(tasks))
	for _, t := range tasks {
		result = append(result, mapTaskInfo(t))
	}
	return result
}

// sortDateField returns the time used to sort a task in the given state,
// mirroring the date column shown in the UI. States without a date column
// return the zero time.
func sortDateField(t *asynq.TaskInfo, state string) time.Time {
	switch state {
	case "scheduled":
		return t.NextProcessAt
	case "retry", "archived":
		return t.LastFailedAt
	case "completed":
		return t.CompletedAt
	default:
		return time.Time{}
	}
}

// sortTasksByState orders tasks in place by the state's date column. dir is
// "asc" or "desc" (default). Tasks with a zero time always sort to the end,
// matching the frontend behaviour. States without a date column are left
// in their natural (asynq) order.
func sortTasksByState(tasks []*asynq.TaskInfo, state, dir string) {
	switch state {
	case "scheduled", "retry", "archived", "completed":
	default:
		return
	}
	sort.SliceStable(tasks, func(i, j int) bool {
		a := sortDateField(tasks[i], state)
		b := sortDateField(tasks[j], state)
		if a.IsZero() || b.IsZero() {
			// non-zero comes before zero; keep order when both zero
			return !a.IsZero() && b.IsZero()
		}
		if dir == "asc" {
			return a.Before(b)
		}
		return a.After(b)
	})
}

// paginate returns the slice of items for a 1-based page. Out-of-range pages
// yield an empty slice.
func paginate(items []TaskInfo, page, pageSize int) []TaskInfo {
	if page < 1 || pageSize < 1 {
		return []TaskInfo{}
	}
	start := (page - 1) * pageSize
	if start >= len(items) {
		return []TaskInfo{}
	}
	end := start + pageSize
	if end > len(items) {
		end = len(items)
	}
	return items[start:end]
}

// listSortedTasks fetches up to taskSortLimit tasks via fetch, sorts the whole
// set by the state's date column, then returns the requested page. This makes
// the sort apply across the entire dataset rather than only the visible page.
func (s *QueueService) listSortedTasks(
	environmentID uint,
	queueName, state, sortDir string,
	page, pageSize int,
	fetch func(*asynq.Inspector) ([]*asynq.TaskInfo, error),
	total func(*asynq.QueueInfo) int,
) (PaginatedTaskList, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return PaginatedTaskList{}, err
	}
	defer inspector.Close()

	tasks, err := fetch(inspector)
	if err != nil {
		return PaginatedTaskList{}, fmt.Errorf("failed to list %s tasks: %w", state, err)
	}

	info, err := inspector.GetQueueInfo(queueName)
	if err != nil {
		return PaginatedTaskList{}, fmt.Errorf("failed to get queue info: %w", err)
	}

	sortTasksByState(tasks, state, sortDir)

	return PaginatedTaskList{
		Tasks:      paginate(mapTaskInfoList(tasks), page, pageSize),
		TotalCount: total(info),
		Page:       page,
		PageSize:   pageSize,
		SortLimit:  taskSortLimit,
	}, nil
}

// ---------------------------------------------------------------------------
// Queue list
// ---------------------------------------------------------------------------

func (s *QueueService) GetQueues(environmentID uint) (QueuesData, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return QueuesData{}, err
	}
	defer inspector.Close()

	queueNames, err := inspector.Queues()
	if err != nil {
		return QueuesData{}, fmt.Errorf("failed to list queues: %w", err)
	}

	data := QueuesData{TotalQueues: len(queueNames)}

	for _, name := range queueNames {
		info, err := inspector.GetQueueInfo(name)
		if err != nil {
			continue
		}

		data.Queues = append(data.Queues, mapQueueInfo(info))
		data.TotalTasks += info.Size

		if info.Paused {
			data.PausedQueues++
		} else {
			data.ActiveQueues++
		}
	}

	return data, nil
}

// ---------------------------------------------------------------------------
// Queue detail
// ---------------------------------------------------------------------------

func (s *QueueService) GetQueueDetail(environmentID uint, queueName string) (QueueDetailData, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return QueueDetailData{}, err
	}
	defer inspector.Close()

	info, err := inspector.GetQueueInfo(queueName)
	if err != nil {
		return QueueDetailData{}, fmt.Errorf("failed to get queue info for %q: %w", queueName, err)
	}

	var history []DailyStats
	dailyStats, err := inspector.History(queueName, 14)
	if err == nil {
		for _, h := range dailyStats {
			history = append(history, DailyStats{
				Date:      h.Date.Format(time.DateOnly),
				Processed: h.Processed,
				Failed:    h.Failed,
			})
		}
	}

	return QueueDetailData{
		Info:    mapQueueInfo(info),
		History: history,
	}, nil
}

// ---------------------------------------------------------------------------
// Queue actions
// ---------------------------------------------------------------------------

func (s *QueueService) PauseQueue(environmentID uint, queueName string) error {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return err
	}
	defer inspector.Close()

	if err := inspector.PauseQueue(queueName); err != nil {
		return fmt.Errorf("failed to pause queue %q: %w", queueName, err)
	}
	return nil
}

func (s *QueueService) UnpauseQueue(environmentID uint, queueName string) error {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return err
	}
	defer inspector.Close()

	if err := inspector.UnpauseQueue(queueName); err != nil {
		return fmt.Errorf("failed to unpause queue %q: %w", queueName, err)
	}
	return nil
}

func (s *QueueService) DeleteQueue(environmentID uint, queueName string, force bool) error {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return err
	}
	defer inspector.Close()

	if err := inspector.DeleteQueue(queueName, force); err != nil {
		return fmt.Errorf("failed to delete queue %q: %w", queueName, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Task listing
// ---------------------------------------------------------------------------

// Pending and Active have no sortable date column, so they keep efficient
// server-side pagination and ignore sortDir.

func (s *QueueService) ListPendingTasks(environmentID uint, queueName string, page, pageSize int, sortDir string) (PaginatedTaskList, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return PaginatedTaskList{}, err
	}
	defer inspector.Close()

	tasks, err := inspector.ListPendingTasks(queueName, asynq.Page(page), asynq.PageSize(pageSize))
	if err != nil {
		return PaginatedTaskList{}, fmt.Errorf("failed to list pending tasks: %w", err)
	}

	info, err := inspector.GetQueueInfo(queueName)
	if err != nil {
		return PaginatedTaskList{}, fmt.Errorf("failed to get queue info: %w", err)
	}

	return PaginatedTaskList{
		Tasks:      mapTaskInfoList(tasks),
		TotalCount: info.Pending,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

func (s *QueueService) ListActiveTasks(environmentID uint, queueName string, page, pageSize int, sortDir string) (PaginatedTaskList, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return PaginatedTaskList{}, err
	}
	defer inspector.Close()

	tasks, err := inspector.ListActiveTasks(queueName, asynq.Page(page), asynq.PageSize(pageSize))
	if err != nil {
		return PaginatedTaskList{}, fmt.Errorf("failed to list active tasks: %w", err)
	}

	info, err := inspector.GetQueueInfo(queueName)
	if err != nil {
		return PaginatedTaskList{}, fmt.Errorf("failed to get queue info: %w", err)
	}

	return PaginatedTaskList{
		Tasks:      mapTaskInfoList(tasks),
		TotalCount: info.Active,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

func (s *QueueService) ListScheduledTasks(environmentID uint, queueName string, page, pageSize int, sortDir string) (PaginatedTaskList, error) {
	return s.listSortedTasks(environmentID, queueName, "scheduled", sortDir, page, pageSize,
		func(insp *asynq.Inspector) ([]*asynq.TaskInfo, error) {
			return insp.ListScheduledTasks(queueName, asynq.Page(1), asynq.PageSize(taskSortLimit))
		},
		func(info *asynq.QueueInfo) int { return info.Scheduled },
	)
}

func (s *QueueService) ListRetryTasks(environmentID uint, queueName string, page, pageSize int, sortDir string) (PaginatedTaskList, error) {
	return s.listSortedTasks(environmentID, queueName, "retry", sortDir, page, pageSize,
		func(insp *asynq.Inspector) ([]*asynq.TaskInfo, error) {
			return insp.ListRetryTasks(queueName, asynq.Page(1), asynq.PageSize(taskSortLimit))
		},
		func(info *asynq.QueueInfo) int { return info.Retry },
	)
}

func (s *QueueService) ListArchivedTasks(environmentID uint, queueName string, page, pageSize int, sortDir string) (PaginatedTaskList, error) {
	return s.listSortedTasks(environmentID, queueName, "archived", sortDir, page, pageSize,
		func(insp *asynq.Inspector) ([]*asynq.TaskInfo, error) {
			return insp.ListArchivedTasks(queueName, asynq.Page(1), asynq.PageSize(taskSortLimit))
		},
		func(info *asynq.QueueInfo) int { return info.Archived },
	)
}

func (s *QueueService) ListCompletedTasks(environmentID uint, queueName string, page, pageSize int, sortDir string) (PaginatedTaskList, error) {
	return s.listSortedTasks(environmentID, queueName, "completed", sortDir, page, pageSize,
		func(insp *asynq.Inspector) ([]*asynq.TaskInfo, error) {
			return insp.ListCompletedTasks(queueName, asynq.Page(1), asynq.PageSize(taskSortLimit))
		},
		func(info *asynq.QueueInfo) int { return info.Completed },
	)
}

// ---------------------------------------------------------------------------
// Individual task actions
// ---------------------------------------------------------------------------

func (s *QueueService) RunTask(environmentID uint, queueName, taskID string) error {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return err
	}
	defer inspector.Close()

	if err := inspector.RunTask(queueName, taskID); err != nil {
		return fmt.Errorf("failed to run task %q: %w", taskID, err)
	}
	return nil
}

func (s *QueueService) DeleteTask(environmentID uint, queueName, taskID string) error {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return err
	}
	defer inspector.Close()

	if err := inspector.DeleteTask(queueName, taskID); err != nil {
		return fmt.Errorf("failed to delete task %q: %w", taskID, err)
	}
	return nil
}

func (s *QueueService) ArchiveTask(environmentID uint, queueName, taskID string) error {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return err
	}
	defer inspector.Close()

	if err := inspector.ArchiveTask(queueName, taskID); err != nil {
		return fmt.Errorf("failed to archive task %q: %w", taskID, err)
	}
	return nil
}

func (s *QueueService) CancelActiveTask(environmentID uint, taskID string) error {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return err
	}
	defer inspector.Close()

	if err := inspector.CancelProcessing(taskID); err != nil {
		return fmt.Errorf("failed to cancel task %q: %w", taskID, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Bulk actions
// ---------------------------------------------------------------------------

func (s *QueueService) RunAllScheduledTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.RunAllScheduledTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to run all scheduled tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) RunAllRetryTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.RunAllRetryTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to run all retry tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) RunAllArchivedTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.RunAllArchivedTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to run all archived tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) ArchiveAllPendingTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.ArchiveAllPendingTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to archive all pending tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) ArchiveAllScheduledTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.ArchiveAllScheduledTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to archive all scheduled tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) ArchiveAllRetryTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.ArchiveAllRetryTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to archive all retry tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) DeleteAllPendingTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.DeleteAllPendingTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to delete all pending tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) DeleteAllScheduledTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.DeleteAllScheduledTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to delete all scheduled tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) DeleteAllRetryTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.DeleteAllRetryTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to delete all retry tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) DeleteAllArchivedTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.DeleteAllArchivedTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to delete all archived tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}

func (s *QueueService) DeleteAllCompletedTasks(environmentID uint, queueName string) (BulkActionResult, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return BulkActionResult{}, err
	}
	defer inspector.Close()

	count, err := inspector.DeleteAllCompletedTasks(queueName)
	if err != nil {
		return BulkActionResult{}, fmt.Errorf("failed to delete all completed tasks: %w", err)
	}
	return BulkActionResult{Count: count}, nil
}
