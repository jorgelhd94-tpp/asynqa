package taskrunner

import (
	"fmt"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jorgelhd94/asynqa/internal/domain"
	env "github.com/jorgelhd94/asynqa/internal/environment"
	"github.com/jorgelhd94/asynqa/internal/shared"
)

type TaskRunnerService struct {
	environmentStore *env.EnvironmentStore
	requestStore     *TaskRunnerRequestStore
}

func NewTaskRunnerService(environmentStore *env.EnvironmentStore, requestStore *TaskRunnerRequestStore) *TaskRunnerService {
	return &TaskRunnerService{
		environmentStore: environmentStore,
		requestStore:     requestStore,
	}
}

func (s *TaskRunnerService) EnqueueTask(environmentID uint, request EnqueueRequest) (EnqueueResult, error) {
	if strings.TrimSpace(request.TaskType) == "" {
		return EnqueueResult{}, fmt.Errorf("task type is required")
	}

	env, err := s.environmentStore.FindByID(environmentID)
	if err != nil {
		return EnqueueResult{}, fmt.Errorf("environment not found: %w", err)
	}

	client := asynq.NewClient(shared.NewRedisOpts(env))
	defer client.Close()

	task := asynq.NewTask(request.TaskType, []byte(request.Payload))

	var opts []asynq.Option

	if request.Queue != "" {
		opts = append(opts, asynq.Queue(request.Queue))
	}
	if request.MaxRetry > 0 {
		opts = append(opts, asynq.MaxRetry(request.MaxRetry))
	}
	if request.TimeoutSecs > 0 {
		opts = append(opts, asynq.Timeout(time.Duration(request.TimeoutSecs)*time.Second))
	}
	if request.DelaySecs > 0 {
		opts = append(opts, asynq.ProcessIn(time.Duration(request.DelaySecs)*time.Second))
	}

	info, err := client.Enqueue(task, opts...)
	if err != nil {
		return EnqueueResult{}, fmt.Errorf("failed to enqueue task: %w", err)
	}

	return EnqueueResult{TaskID: info.ID}, nil
}

func (s *TaskRunnerService) GetSavedRequests(environmentID uint) ([]SavedRequest, error) {
	requests, err := s.requestStore.GetByEnvironmentID(environmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get saved requests: %w", err)
	}

	result := make([]SavedRequest, len(requests))
	for i, r := range requests {
		result[i] = toSavedRequest(r)
	}
	return result, nil
}

func (s *TaskRunnerService) GetSavedRequest(requestID uint) (SavedRequest, error) {
	req, err := s.requestStore.FindByID(requestID)
	if err != nil {
		return SavedRequest{}, fmt.Errorf("saved request not found: %w", err)
	}
	return toSavedRequest(req), nil
}

func (s *TaskRunnerService) CreateSavedRequest(environmentID uint, input CreateSavedRequestInput) (SavedRequest, error) {
	req := domain.TaskRunnerRequest{
		EnvironmentID: environmentID,
		Name:          input.Name,
		Queue:         input.Queue,
		TaskType:      input.TaskType,
		Payload:       input.Payload,
		MaxRetry:      input.MaxRetry,
		TimeoutSecs:   input.TimeoutSecs,
		DelaySecs:     input.DelaySecs,
	}

	if err := s.requestStore.Create(&req); err != nil {
		return SavedRequest{}, fmt.Errorf("failed to create saved request: %w", err)
	}

	return toSavedRequest(req), nil
}

func (s *TaskRunnerService) UpdateSavedRequest(requestID uint, input UpdateSavedRequestInput) (SavedRequest, error) {
	req, err := s.requestStore.FindByID(requestID)
	if err != nil {
		return SavedRequest{}, fmt.Errorf("saved request not found: %w", err)
	}

	req.Name = input.Name
	req.Queue = input.Queue
	req.TaskType = input.TaskType
	req.Payload = input.Payload
	req.MaxRetry = input.MaxRetry
	req.TimeoutSecs = input.TimeoutSecs
	req.DelaySecs = input.DelaySecs

	if err := s.requestStore.Update(&req); err != nil {
		return SavedRequest{}, fmt.Errorf("failed to update saved request: %w", err)
	}

	return toSavedRequest(req), nil
}

func (s *TaskRunnerService) RenameSavedRequest(requestID uint, input RenameSavedRequestInput) error {
	req, err := s.requestStore.FindByID(requestID)
	if err != nil {
		return fmt.Errorf("saved request not found: %w", err)
	}

	req.Name = input.Name
	if err := s.requestStore.Update(&req); err != nil {
		return fmt.Errorf("failed to rename saved request: %w", err)
	}

	return nil
}

func (s *TaskRunnerService) CloneSavedRequest(requestID uint) (SavedRequest, error) {
	original, err := s.requestStore.FindByID(requestID)
	if err != nil {
		return SavedRequest{}, fmt.Errorf("saved request not found: %w", err)
	}

	clone := domain.TaskRunnerRequest{
		EnvironmentID: original.EnvironmentID,
		Name:          original.Name + " (copy)",
		Queue:         original.Queue,
		TaskType:      original.TaskType,
		Payload:       original.Payload,
		MaxRetry:      original.MaxRetry,
		TimeoutSecs:   original.TimeoutSecs,
		DelaySecs:     original.DelaySecs,
	}

	if err := s.requestStore.Create(&clone); err != nil {
		return SavedRequest{}, fmt.Errorf("failed to clone saved request: %w", err)
	}

	return toSavedRequest(clone), nil
}

func (s *TaskRunnerService) DeleteSavedRequest(requestID uint) error {
	if err := s.requestStore.Delete(requestID); err != nil {
		return fmt.Errorf("failed to delete saved request: %w", err)
	}
	return nil
}

func toSavedRequest(r domain.TaskRunnerRequest) SavedRequest {
	return SavedRequest{
		ID:            r.ID,
		EnvironmentID: r.EnvironmentID,
		Name:          r.Name,
		Queue:         r.Queue,
		TaskType:      r.TaskType,
		Payload:       r.Payload,
		MaxRetry:      r.MaxRetry,
		TimeoutSecs:   r.TimeoutSecs,
		DelaySecs:     r.DelaySecs,
	}
}
