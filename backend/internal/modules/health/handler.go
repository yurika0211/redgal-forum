package health

import (
	"context"
	"net"
	"net/http"
	"time"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/http/response"
	"example.com/rubedo/backend/internal/platform"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	config   config.Config
	platform *platform.Platform
}

type serviceDetail struct {
	Configured bool   `json:"configured"`
	Reachable  bool   `json:"reachable"`
	Error      string `json:"error,omitempty"`
}

func NewHandler(cfg config.Config, platform *platform.Platform) *Handler {
	return &Handler{
		config:   cfg,
		platform: platform,
	}
}

func (h *Handler) Get(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 1500*time.Millisecond)
	defer cancel()

	var (
		postgresClient servicePinger
		redisClient    servicePinger
		searchClient   servicePinger
	)
	if h.platform != nil {
		postgresClient = h.platform.Postgres
		redisClient = h.platform.Redis
		searchClient = h.platform.Search
	}

	details := map[string]serviceDetail{
		"postgres":    probeService(ctx, postgresClient),
		"redis":       probeService(ctx, redisClient),
		"meilisearch": probeService(ctx, searchClient),
	}

	services := gin.H{}
	serviceDetails := gin.H{}
	for name, detail := range details {
		services[name] = detail.Reachable
		serviceDetails[name] = detail
	}

	response.OK(c, gin.H{
		"app":             h.config.App.Name,
		"env":             h.config.App.Env,
		"services":        services,
		"service_details": serviceDetails,
		"modules": []string{
			"auth",
			"user",
			"activity",
			"article",
			"forum",
			"sitecontent",
			"wall",
			"luckybot",
		},
	})
}

type servicePinger interface {
	Available() bool
	PingContext(ctx context.Context) error
}

func probeService(ctx context.Context, client servicePinger) serviceDetail {
	if client == nil || !client.Available() {
		return serviceDetail{}
	}

	if err := client.PingContext(ctx); err != nil {
		return serviceDetail{
			Configured: true,
			Reachable:  false,
			Error:      normalizeProbeError(err),
		}
	}

	return serviceDetail{
		Configured: true,
		Reachable:  true,
	}
}

func normalizeProbeError(err error) string {
	if err == nil {
		return ""
	}

	if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
		return "timeout"
	}

	if errorsIsClosed(err) {
		return "not configured"
	}

	return err.Error()
}

func errorsIsClosed(err error) bool {
	return err == net.ErrClosed || err == http.ErrServerClosed
}
