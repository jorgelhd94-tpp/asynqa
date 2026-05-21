package environment

import (
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/jorgelhd94/asynqa/internal/domain"
	"github.com/jorgelhd94/asynqa/internal/shared"
)

type EnvironmentService struct {
	store      *EnvironmentStore
	inspectors *shared.InspectorManager
}

func NewEnvironmentService(store *EnvironmentStore, inspectors *shared.InspectorManager) *EnvironmentService {
	return &EnvironmentService{store: store, inspectors: inspectors}
}

func (s *EnvironmentService) GetAll() ([]domain.Environment, error) {
	return s.store.GetAll()
}

func (s *EnvironmentService) Create(env domain.Environment) (domain.Environment, error) {
	if err := s.store.Create(&env); err != nil {
		return domain.Environment{}, err
	}
	return env, nil
}

func (s *EnvironmentService) Update(env domain.Environment) (domain.Environment, error) {
	if err := s.store.Update(&env); err != nil {
		return domain.Environment{}, err
	}
	// Connection settings may have changed; drop the cached inspector so the
	// next request reconnects with the new settings.
	s.inspectors.Invalidate(env.ID)
	return env, nil
}

func (s *EnvironmentService) Delete(id uint) error {
	if err := s.store.Delete(id); err != nil {
		return err
	}
	s.inspectors.Invalidate(id)
	return nil
}

func (s *EnvironmentService) TestConnection(env domain.Environment) error {
	inspector := asynq.NewInspector(shared.NewRedisOpts(env))
	defer inspector.Close()

	_, err := inspector.Queues()
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}

	return nil
}
