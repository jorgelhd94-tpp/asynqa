package shared

import (
	"os"
	"testing"

	"github.com/hibiken/asynq"
	"github.com/jorgelhd94/asynqa/internal/domain"
	"gorm.io/gorm"
)

// TestInspectorManager_RealRedis exercises the risky pooling path against a
// live Redis: it confirms a pooled inspector performs real operations, that a
// reused (cached) inspector sees data enqueued after it was first handed out,
// and that Invalidate (the path triggered by editing an environment) lets the
// next Get reconnect and keep working.
//
// It is skipped unless REDIS_ADDR points at a reachable Redis, so the default
// `go test ./...` run stays free of any live-Redis dependency.
func TestInspectorManager_RealRedis(t *testing.T) {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		t.Skip("set REDIS_ADDR to run the live-Redis inspector smoke test")
	}

	const queueName = "smoke"
	env := domain.Environment{Model: gorm.Model{ID: 1}, Host: addr}
	opts := NewRedisOpts(env)

	// Clean slate, then enqueue a first pending task.
	client := asynq.NewClient(opts)
	defer client.Close()
	inspClean := asynq.NewInspector(opts)
	_, _ = inspClean.DeleteAllPendingTasks(queueName)
	inspClean.Close()

	enqueue := func(payload string) {
		t.Helper()
		if _, err := client.Enqueue(
			asynq.NewTask("smoke:task", []byte(payload)),
			asynq.Queue(queueName),
		); err != nil {
			t.Fatalf("enqueue: %v", err)
		}
	}

	enqueue(`{"n":1}`)

	mgr := NewInspectorManager()
	defer mgr.Close()

	// 1. A pooled inspector does real work and sees the first task.
	insp1 := mgr.Get(env)
	pending, err := insp1.ListPendingTasks(queueName)
	if err != nil {
		t.Fatalf("ListPendingTasks (first): %v", err)
	}
	if len(pending) != 1 {
		t.Fatalf("expected 1 pending task, got %d", len(pending))
	}

	// 2. Get returns the SAME cached instance (no new connection per poll).
	if insp2 := mgr.Get(env); insp2 != insp1 {
		t.Fatal("expected Get to return the cached inspector instance")
	}

	// 3. The reused inspector sees data enqueued after it was handed out — the
	//    cached connection is not serving a stale snapshot.
	enqueue(`{"n":2}`)
	pending, err = insp1.ListPendingTasks(queueName)
	if err != nil {
		t.Fatalf("ListPendingTasks (reused): %v", err)
	}
	if len(pending) != 2 {
		t.Fatalf("expected 2 pending tasks after reuse, got %d", len(pending))
	}

	// 4. Invalidate (what editing an environment triggers) closes the cached
	//    inspector; the next Get rebuilds a fresh one that still works.
	mgr.Invalidate(env.ID)
	insp3 := mgr.Get(env)
	if insp3 == insp1 {
		t.Fatal("expected a fresh inspector instance after Invalidate")
	}
	pending, err = insp3.ListPendingTasks(queueName)
	if err != nil {
		t.Fatalf("ListPendingTasks (after reconnect): %v", err)
	}
	if len(pending) != 2 {
		t.Fatalf("expected 2 pending tasks after reconnect, got %d", len(pending))
	}

	// Cleanup.
	if _, err := insp3.DeleteAllPendingTasks(queueName); err != nil {
		t.Fatalf("cleanup DeleteAllPendingTasks: %v", err)
	}
}
