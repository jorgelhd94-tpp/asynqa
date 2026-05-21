package dashboard

import (
	"fmt"
	"log/slog"
	"time"

	env "github.com/jorgelhd94/asynqa/internal/environment"
	"github.com/jorgelhd94/asynqa/internal/shared"
)

type DashboardService struct {
	environmentStore *env.EnvironmentStore
	inspectors       *shared.InspectorManager
}

func NewDashboardService(environmentStore *env.EnvironmentStore, inspectors *shared.InspectorManager) *DashboardService {
	return &DashboardService{environmentStore: environmentStore, inspectors: inspectors}
}

func (s *DashboardService) GetDashboard(environmentID uint) (DashboardData, error) {
	env, err := s.environmentStore.FindByID(environmentID)
	if err != nil {
		return DashboardData{}, fmt.Errorf("environment not found: %w", err)
	}

	inspector := s.inspectors.Get(env)

	queueNames, err := inspector.Queues()
	if err != nil {
		return DashboardData{}, fmt.Errorf("failed to list queues: %w", err)
	}

	data := DashboardData{}

	for _, name := range queueNames {
		info, err := inspector.GetQueueInfo(name)
		if err != nil {
			slog.Warn("dashboard: skipping queue, failed to get info", "queue", name, "error", err)
			continue
		}

		qs := QueueStats{
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

		data.Queues = append(data.Queues, qs)
		data.TotalTasks += info.Size
		data.TotalPending += info.Pending
		data.TotalActive += info.Active
		data.TotalFailed += info.FailedTotal
	}

	if len(queueNames) > 0 {
		historyMap := make(map[string]DailyStats)
		for _, name := range queueNames {
			history, err := inspector.History(name, shared.HistoryDays)
			if err != nil {
				slog.Warn("dashboard: skipping history, failed to load", "queue", name, "error", err)
				continue
			}
			for _, h := range history {
				dateStr := h.Date.Format(time.DateOnly)
				entry := historyMap[dateStr]
				entry.Date = dateStr
				entry.Processed += h.Processed
				entry.Failed += h.Failed
				historyMap[dateStr] = entry
			}
		}
		for _, v := range historyMap {
			data.History = append(data.History, v)
		}
	}

	servers, err := inspector.Servers()
	if err == nil {
		data.ServerCount = len(servers)
	}

	return data, nil
}
