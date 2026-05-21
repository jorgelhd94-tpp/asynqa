package shared

import (
	"testing"

	"github.com/hibiken/asynq"
	"github.com/jorgelhd94/asynqa/internal/domain"
	"gorm.io/gorm"
)

// newTestManager returns a manager whose factory counts calls and returns
// lazy inspectors (asynq does not connect until a command runs).
func newTestManager() (*InspectorManager, *int) {
	calls := 0
	m := &InspectorManager{
		inspectors: make(map[uint]*asynq.Inspector),
	}
	m.newFn = func(env domain.Environment) *asynq.Inspector {
		calls++
		return asynq.NewInspector(asynq.RedisClientOpt{Addr: "localhost:6379"})
	}
	return m, &calls
}

func env(id uint) domain.Environment {
	return domain.Environment{Model: gorm.Model{ID: id}}
}

func TestInspectorManager_CachesPerEnvironment(t *testing.T) {
	m, calls := newTestManager()
	defer m.Close()

	a1 := m.Get(env(1))
	a2 := m.Get(env(1))
	if a1 != a2 {
		t.Fatal("expected the same cached inspector for env 1")
	}
	if *calls != 1 {
		t.Fatalf("factory called %d times, want 1", *calls)
	}

	m.Get(env(2))
	if *calls != 2 {
		t.Fatalf("factory called %d times for two envs, want 2", *calls)
	}
}

func TestInspectorManager_InvalidateRebuilds(t *testing.T) {
	m, calls := newTestManager()
	defer m.Close()

	m.Get(env(1))
	m.Invalidate(1)
	m.Get(env(1))
	if *calls != 2 {
		t.Fatalf("factory called %d times after invalidate, want 2", *calls)
	}

	// Invalidating an unknown env is a no-op.
	m.Invalidate(999)
}

func TestInspectorManager_CloseClears(t *testing.T) {
	m, calls := newTestManager()
	m.Get(env(1))
	m.Get(env(2))
	m.Close()

	// After Close the cache is empty, so Get rebuilds.
	m.Get(env(1))
	if *calls != 3 {
		t.Fatalf("factory called %d times, want 3", *calls)
	}
	m.Close()
}
