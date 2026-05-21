package shared

import (
	"crypto/tls"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jorgelhd94/asynqa/internal/domain"
)

// redisTimeout bounds connect/read/write so a hung or unreachable Redis fails
// fast instead of stalling the UI's polling requests.
const redisTimeout = 5 * time.Second

// HistoryDays is how many days of daily stats the dashboard and queue detail
// views request from asynq.
const HistoryDays = 14

func NewRedisOpts(env domain.Environment) asynq.RedisClientOpt {
	opts := asynq.RedisClientOpt{
		Addr:         env.Host,
		Password:     env.Password,
		DB:           env.DB,
		DialTimeout:  redisTimeout,
		ReadTimeout:  redisTimeout,
		WriteTimeout: redisTimeout,
	}

	if env.UseTLS {
		opts.TLSConfig = &tls.Config{
			InsecureSkipVerify: env.TLSSkipVerify,
		}
	}

	return opts
}
