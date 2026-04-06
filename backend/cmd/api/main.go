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

	"example.com/rubedo/backend/internal/bootstrap"
	"example.com/rubedo/backend/internal/config"
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

	handler := bootstrap.NewAPIHandler(cfg, logger, infra)

	server := &http.Server{
		Addr:              cfg.HTTP.Address(),
		Handler:           handler,
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
