package shared

import (
	"sync"

	"github.com/hibiken/asynq"
	"github.com/jorgelhd94/asynqa/internal/domain"
)

// InspectorManager caches one asynq.Inspector per environment so that the
// frontend's frequent polling reuses Redis connections instead of opening and
// closing a fresh pool on every call.
//
// The manager owns the lifecycle of every inspector it hands out: callers must
// NOT Close the returned inspector. Invalidate must be called whenever an
// environment's connection settings change or it is deleted, and Close on app
// shutdown. asynq.Inspector is safe for concurrent use, so a single cached
// instance can serve concurrent requests.
type InspectorManager struct {
	mu         sync.Mutex
	inspectors map[uint]*asynq.Inspector
	newFn      func(domain.Environment) *asynq.Inspector
}

func NewInspectorManager() *InspectorManager {
	return &InspectorManager{
		inspectors: make(map[uint]*asynq.Inspector),
		newFn: func(env domain.Environment) *asynq.Inspector {
			return asynq.NewInspector(NewRedisOpts(env))
		},
	}
}

// Get returns a cached inspector for the environment, creating one on first
// use. The returned inspector is owned by the manager — do not Close it.
func (m *InspectorManager) Get(env domain.Environment) *asynq.Inspector {
	m.mu.Lock()
	defer m.mu.Unlock()
	if insp, ok := m.inspectors[env.ID]; ok {
		return insp
	}
	insp := m.newFn(env)
	m.inspectors[env.ID] = insp
	return insp
}

// Invalidate closes and drops the cached inspector for an environment, so the
// next Get rebuilds it with fresh connection settings.
func (m *InspectorManager) Invalidate(environmentID uint) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if insp, ok := m.inspectors[environmentID]; ok {
		insp.Close()
		delete(m.inspectors, environmentID)
	}
}

// Close closes every cached inspector. Call once on application shutdown.
func (m *InspectorManager) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for id, insp := range m.inspectors {
		insp.Close()
		delete(m.inspectors, id)
	}
}
