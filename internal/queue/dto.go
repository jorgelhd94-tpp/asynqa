package queue

type QueuesData struct {
	Queues       []QueueInfo `json:"queues"`
	TotalQueues  int         `json:"totalQueues"`
	ActiveQueues int         `json:"activeQueues"`
	PausedQueues int         `json:"pausedQueues"`
	TotalTasks   int         `json:"totalTasks"`
}

type QueueInfo struct {
	Queue          string `json:"queue"`
	Size           int    `json:"size"`
	Pending        int    `json:"pending"`
	Active         int    `json:"active"`
	Scheduled      int    `json:"scheduled"`
	Retry          int    `json:"retry"`
	Archived       int    `json:"archived"`
	Completed      int    `json:"completed"`
	Processed      int    `json:"processed"`
	Failed         int    `json:"failed"`
	ProcessedTotal int    `json:"processedTotal"`
	FailedTotal    int    `json:"failedTotal"`
	LatencyMs      int64  `json:"latencyMs"`
	MemoryUsage    int64  `json:"memoryUsage"`
	Paused         bool   `json:"paused"`
}

type QueueDetailData struct {
	Info    QueueInfo    `json:"info"`
	History []DailyStats `json:"history"`
}

type DailyStats struct {
	Date      string `json:"date"`
	Processed int    `json:"processed"`
	Failed    int    `json:"failed"`
}

type TaskInfo struct {
	ID            string `json:"id"`
	Queue         string `json:"queue"`
	Type          string `json:"type"`
	Payload       string `json:"payload"`
	State         string `json:"state"`
	MaxRetry      int    `json:"maxRetry"`
	Retried       int    `json:"retried"`
	LastErr       string `json:"lastErr"`
	LastFailedAt  string `json:"lastFailedAt"`
	NextProcessAt string `json:"nextProcessAt"`
	TimeoutSecs   int64  `json:"timeoutSecs"`
	RetentionSecs int64  `json:"retentionSecs"`
	Deadline      string `json:"deadline"`
	CompletedAt   string `json:"completedAt"`
	Group         string `json:"group"`
	Result        string `json:"result"`
	IsOrphaned    bool   `json:"isOrphaned"`
}

type PaginatedTaskList struct {
	Tasks      []TaskInfo `json:"tasks"`
	TotalCount int        `json:"totalCount"`
	Page       int        `json:"page"`
	PageSize   int        `json:"pageSize"`
	// SortLimit is the max number of tasks that get globally sorted before
	// pagination. When TotalCount exceeds it, sorting only covers the first
	// SortLimit tasks (the UI surfaces this).
	SortLimit int `json:"sortLimit"`
}

type BulkActionResult struct {
	Count int `json:"count"`
}
