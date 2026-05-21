package worker

import (
	"fmt"

	"github.com/hibiken/asynq"
	env "github.com/jorgelhd94/asynqa/internal/environment"
	"github.com/jorgelhd94/asynqa/internal/shared"
)

type WorkerService struct {
	environmentStore *env.EnvironmentStore
	inspectors       *shared.InspectorManager
}

func NewWorkerService(environmentStore *env.EnvironmentStore, inspectors *shared.InspectorManager) *WorkerService {
	return &WorkerService{environmentStore: environmentStore, inspectors: inspectors}
}

// newInspector returns a pooled inspector owned by the manager — do not Close it.
func (s *WorkerService) newInspector(environmentID uint) (*asynq.Inspector, error) {
	env, err := s.environmentStore.FindByID(environmentID)
	if err != nil {
		return nil, fmt.Errorf("environment not found: %w", err)
	}
	return s.inspectors.Get(env), nil
}

func (s *WorkerService) GetWorkers(environmentID uint) (WorkersData, error) {
	inspector, err := s.newInspector(environmentID)
	if err != nil {
		return WorkersData{}, err
	}

	servers, err := inspector.Servers()
	if err != nil {
		return WorkersData{}, fmt.Errorf("failed to list servers: %w", err)
	}

	data := WorkersData{}

	for _, srv := range servers {
		var workers []WorkerInfo
		for _, w := range srv.ActiveWorkers {
			workers = append(workers, WorkerInfo{
				TaskID:  w.TaskID,
				Queue:   w.Queue,
				Type:    w.TaskType,
				Payload: string(w.TaskPayload),
				Started: shared.FormatTime(w.Started),
			})
		}

		queues := make([]string, 0, len(srv.Queues))
		for q := range srv.Queues {
			queues = append(queues, q)
		}

		data.Servers = append(data.Servers, ServerInfo{
			ID:             srv.ID,
			Host:           srv.Host,
			PID:            srv.PID,
			Queues:         queues,
			StrictPriority: srv.StrictPriority,
			Started:        shared.FormatTime(srv.Started),
			Status:         srv.Status,
			Concurrency:    srv.Concurrency,
			ActiveWorkers:  workers,
		})
		data.TotalWorkers += len(workers)
	}

	return data, nil
}
