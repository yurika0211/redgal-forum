package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/http/router"
	"example.com/rubedo/backend/internal/modules/activity"
	"example.com/rubedo/backend/internal/modules/article"
	"example.com/rubedo/backend/internal/modules/auth"
	"example.com/rubedo/backend/internal/modules/forum"
	"example.com/rubedo/backend/internal/modules/health"
	"example.com/rubedo/backend/internal/modules/luckybot"
	"example.com/rubedo/backend/internal/modules/sitecontent"
	"example.com/rubedo/backend/internal/modules/user"
	"example.com/rubedo/backend/internal/modules/wall"
	"example.com/rubedo/backend/internal/platform"
)

func main() {
	if _, err := config.LoadEnvFromDefaultFiles(); err != nil {
		fmt.Fprintf(os.Stderr, "warning: failed to load .env files: %v\n", err)
	}

	cfg := config.Load()
	logger := newLogger(cfg.App.Env)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	infra, err := platform.New(cfg)
	if err != nil {
		logger.Error("failed to initialize platform", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := infra.Close(); err != nil {
			logger.Error("failed to close platform resources", "error", err)
		}
	}()

	engine := router.New(router.Dependencies{
		Config:          cfg,
		Logger:          logger,
		HealthHandler:   health.NewHandler(cfg, infra),
		AuthHandler:     auth.NewHandler(auth.NewService(auth.NewRepository(infra, cfg.Auth))),
		UserHandler:     user.NewHandler(user.NewService(user.NewRepository(infra))),
		ActivityHandler: activity.NewHandler(activity.NewService(activity.NewRepository(infra))),
		ArticleHandler:  article.NewHandler(article.NewService(article.NewRepository(infra))),
		ForumHandler:    forum.NewHandler(forum.NewService(forum.NewRepository(infra))),
		SiteHandler:     sitecontent.NewHandler(sitecontent.NewService(sitecontent.NewRepository(infra))),
		WallHandler:     wall.NewHandler(wall.NewService(wall.NewRepository(infra))),
		Luckybot:        luckybot.NewHandler(luckybot.NewService(luckybot.NewRepository(infra))),
	})

	server := &http.Server{
		Addr:              cfg.HTTP.Address(),
		Handler:           engine,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		<-ctx.Done()

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("failed to shutdown server", "error", err)
		}
	}()

	logger.Info("backend scaffold ready", "addr", cfg.HTTP.Address(), "env", cfg.App.Env)

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server exited unexpectedly", "error", err)
		os.Exit(1)
	}
}

func newLogger(env string) *slog.Logger {
	level := slog.LevelInfo
	if env == "development" {
		level = slog.LevelDebug
	}

	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	}))
}
