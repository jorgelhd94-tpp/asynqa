package queue

import (
	"testing"
	"time"

	"github.com/hibiken/asynq"
)

func ids(tasks []*asynq.TaskInfo) []string {
	out := make([]string, len(tasks))
	for i, t := range tasks {
		out[i] = t.ID
	}
	return out
}

func TestSortTasksByState(t *testing.T) {
	t10 := time.Date(2026, 5, 21, 10, 0, 0, 0, time.UTC)
	t11 := time.Date(2026, 5, 21, 11, 0, 0, 0, time.UTC)
	t12 := time.Date(2026, 5, 21, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name  string
		state string
		dir   string
		in    []*asynq.TaskInfo
		want  []string
	}{
		{
			name:  "retry desc by last failed",
			state: "retry",
			dir:   "desc",
			in: []*asynq.TaskInfo{
				{ID: "a", LastFailedAt: t11},
				{ID: "b", LastFailedAt: t12},
				{ID: "c", LastFailedAt: t10},
			},
			want: []string{"b", "a", "c"},
		},
		{
			name:  "retry asc by last failed",
			state: "retry",
			dir:   "asc",
			in: []*asynq.TaskInfo{
				{ID: "a", LastFailedAt: t11},
				{ID: "b", LastFailedAt: t12},
				{ID: "c", LastFailedAt: t10},
			},
			want: []string{"c", "a", "b"},
		},
		{
			name:  "scheduled desc by next process",
			state: "scheduled",
			dir:   "desc",
			in: []*asynq.TaskInfo{
				{ID: "a", NextProcessAt: t10},
				{ID: "b", NextProcessAt: t12},
				{ID: "c", NextProcessAt: t11},
			},
			want: []string{"b", "c", "a"},
		},
		{
			name:  "completed desc by completed at",
			state: "completed",
			dir:   "desc",
			in: []*asynq.TaskInfo{
				{ID: "a", CompletedAt: t10},
				{ID: "b", CompletedAt: t12},
			},
			want: []string{"b", "a"},
		},
		{
			name:  "zero times sort last regardless of direction",
			state: "retry",
			dir:   "desc",
			in: []*asynq.TaskInfo{
				{ID: "a", LastFailedAt: time.Time{}},
				{ID: "b", LastFailedAt: t11},
				{ID: "c", LastFailedAt: time.Time{}},
			},
			want: []string{"b", "a", "c"},
		},
		{
			name:  "pending keeps original order (no date column)",
			state: "pending",
			dir:   "desc",
			in: []*asynq.TaskInfo{
				{ID: "a"}, {ID: "b"}, {ID: "c"},
			},
			want: []string{"a", "b", "c"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sortTasksByState(tc.in, tc.state, tc.dir)
			got := ids(tc.in)
			if len(got) != len(tc.want) {
				t.Fatalf("len = %d, want %d", len(got), len(tc.want))
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Fatalf("order = %v, want %v", got, tc.want)
				}
			}
		})
	}
}

func TestPaginate(t *testing.T) {
	items := []TaskInfo{{ID: "1"}, {ID: "2"}, {ID: "3"}, {ID: "4"}, {ID: "5"}}

	tests := []struct {
		name     string
		page     int
		pageSize int
		want     []string
	}{
		{"first page", 1, 2, []string{"1", "2"}},
		{"middle page", 2, 2, []string{"3", "4"}},
		{"last partial page", 3, 2, []string{"5"}},
		{"page beyond range", 4, 2, []string{}},
		{"page size larger than data", 1, 100, []string{"1", "2", "3", "4", "5"}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := paginate(items, tc.page, tc.pageSize)
			gotIDs := make([]string, len(got))
			for i, it := range got {
				gotIDs[i] = it.ID
			}
			if len(gotIDs) != len(tc.want) {
				t.Fatalf("got %v, want %v", gotIDs, tc.want)
			}
			for i := range gotIDs {
				if gotIDs[i] != tc.want[i] {
					t.Fatalf("got %v, want %v", gotIDs, tc.want)
				}
			}
		})
	}
}
