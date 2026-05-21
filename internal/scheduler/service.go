package scheduler

import (
	"fmt"

	"github.com/hibiken/asynq"
	env "github.com/jorgelhd94/asynqa/internal/environment"
	"github.com/jorgelhd94/asynqa/internal/shared"
)

type SchedulerService struct {
	environmentStore *env.EnvironmentStore
	inspectors       *shared.InspectorManager
}

func NewSchedulerService(environmentStore *env.EnvironmentStore, inspectors *shared.InspectorManager) *SchedulerService {
	return &SchedulerService{environmentStore: environmentStore, inspectors: inspectors}
}

// newInspector returns a pooled inspector owned by the manager — do not Close it.
func (s *SchedulerService) newInspector(environmentID uint) (*asynq.Inspector, error) {
	env, err := s.environmentStore.FindByID(environmentID)
	if err != nil {
		return nil, fmt.Errorf("environment not found: %w", err)
	}
	return s.inspectors.Get(env), nil
}


func (s *SchedulerService) GetSchedulerEntries(environmentID uint) (SchedulersData, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return SchedulersData{}, err
	}

	entries, err := inspector.SchedulerEntries()
	if err != nil {
		return SchedulersData{}, fmt.Errorf("failed to list scheduler entries: %w", err)
	}

	data := SchedulersData{}
	for _, e := range entries {
		opts := make([]string, len(e.Opts))
		for i, o := range e.Opts {
			opts[i] = fmt.Sprintf("%v", o)
		}

		var taskType string
		var taskPayload string
		if e.Task != nil {
			taskType = e.Task.Type()
			taskPayload = string(e.Task.Payload())
		}

		data.Entries = append(data.Entries, SchedulerEntry{
			ID:            e.ID,
			Spec:          e.Spec,
			TaskType:      taskType,
			TaskPayload:   taskPayload,
			Options:       opts,
			NextEnqueueAt: shared.FormatTime(e.Next),
			PrevEnqueueAt: shared.FormatTime(e.Prev),
		})
	}

	return data, nil
}

func (s *SchedulerService) RunSchedulerEntry(environmentID uint, entryID string) (RunResult, error) {
	env, err := s.environmentStore.FindByID(environmentID)
	if err != nil {
		return RunResult{}, fmt.Errorf("environment not found: %w", err)
	}

	inspector := s.inspectors.Get(env)

	entries, err := inspector.SchedulerEntries()
	if err != nil {
		return RunResult{}, fmt.Errorf("failed to list scheduler entries: %w", err)
	}

	var found *asynq.SchedulerEntry
	for _, e := range entries {
		if e.ID == entryID {
			found = e
			break
		}
	}
	if found == nil {
		return RunResult{}, fmt.Errorf("scheduler entry %q not found", entryID)
	}

	if found.Task == nil {
		return RunResult{}, fmt.Errorf("scheduler entry %q has no task", entryID)
	}

	client := asynq.NewClient(shared.NewRedisOpts(env))
	defer client.Close()

	info, err := client.Enqueue(found.Task, found.Opts...)
	if err != nil {
		return RunResult{}, fmt.Errorf("failed to enqueue task: %w", err)
	}

	return RunResult{TaskID: info.ID, Queue: info.Queue}, nil
}

func (s *SchedulerService) GetEnqueueEvents(environmentID uint, entryID string, page, pageSize int) (PaginatedEvents, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return PaginatedEvents{}, err
	}

	events, err := inspector.ListSchedulerEnqueueEvents(
		entryID,
		asynq.Page(page),
		asynq.PageSize(pageSize),
	)
	if err != nil {
		return PaginatedEvents{}, fmt.Errorf("failed to list enqueue events: %w", err)
	}

	result := PaginatedEvents{
		Page:     page,
		PageSize: pageSize,
	}
	for _, ev := range events {
		result.Events = append(result.Events, EnqueueEvent{
			TaskID:     ev.TaskID,
			EnqueuedAt: shared.FormatTime(ev.EnqueuedAt),
		})
	}
	result.TotalCount = len(events)

	return result, nil
}
