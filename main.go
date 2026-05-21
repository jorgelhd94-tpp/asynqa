package main

import (
	"context"
	"embed"
	"log"
	"log/slog"
	"os"
	"strings"

	"github.com/jorgelhd94/asynqa/infrastructure/database"
	dashservice "github.com/jorgelhd94/asynqa/internal/dashboard"
	env "github.com/jorgelhd94/asynqa/internal/environment"
	queuepkg "github.com/jorgelhd94/asynqa/internal/queue"
	redispkg "github.com/jorgelhd94/asynqa/internal/redis"
	"github.com/jorgelhd94/asynqa/internal/scheduler"
	"github.com/jorgelhd94/asynqa/internal/shared"
	"github.com/jorgelhd94/asynqa/internal/taskrunner"
	"github.com/jorgelhd94/asynqa/internal/updater"
	"github.com/jorgelhd94/asynqa/internal/worker"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

const appName = "AsynQA"

var version = "dev"

// logLevel reads the LOG_LEVEL env var (debug|info|warn|error), defaulting to
// info, so production issues can be debugged without recompiling.
func logLevel() slog.Level {
	switch strings.ToLower(os.Getenv("LOG_LEVEL")) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func initLogger() {
	opts := &slog.HandlerOptions{
		Level: logLevel(),
	}
	handler := slog.NewTextHandler(os.Stdout, opts)
	slog.SetDefault(slog.New(handler))
}

func main() {
	initLogger()

	db, err := database.InitSqlite()
	if err != nil {
		log.Fatalf("Error starting DB: %s", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Error getting underlying DB: %s", err)
	}
	defer sqlDB.Close()

	// Stores
	environmentStore := env.NewEnvironmentStore(db)

	// Shared per-environment Redis inspector pool (reused across polling calls).
	inspectors := shared.NewInspectorManager()
	defer inspectors.Close()

	// Services
	environmentService := env.NewEnvironmentService(environmentStore, inspectors)
	dashboardService := dashservice.NewDashboardService(environmentStore, inspectors)
	queueService := queuepkg.NewQueueService(environmentStore, inspectors)
	workerService := worker.NewWorkerService(environmentStore, inspectors)
	schedulerService := scheduler.NewSchedulerService(environmentStore, inspectors)
	redisService := redispkg.NewRedisService(environmentStore)
	requestStore := taskrunner.NewTaskRunnerRequestStore(db)
	taskRunnerService := taskrunner.NewTaskRunnerService(environmentStore, requestStore)
	updaterService := updater.NewUpdaterService(version)

	err = wails.Run(&options.App{
		Title:            appName,
		Width:            1024,
		Height:           768,
		MinWidth:         800,
		MinHeight:        600,
		WindowStartState: options.Maximised,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        func(_ context.Context) {},
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarHiddenInset(),
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			About: &mac.AboutInfo{
				Title:   appName,
				Message: "Desktop tool for managing asynq task queues",
			},
		},
		Bind: []any{
			environmentService,
			dashboardService,
			queueService,
			workerService,
			schedulerService,
			redisService,
			taskRunnerService,
			updaterService,
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
