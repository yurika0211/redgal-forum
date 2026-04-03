package health

import (
	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/http/response"
	"example.com/rubedo/backend/internal/platform"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	config   config.Config
	platform *platform.Platform
}

func NewHandler(cfg config.Config, platform *platform.Platform) *Handler {
	return &Handler{
		config:   cfg,
		platform: platform,
	}
}

func (h *Handler) Get(c *gin.Context) {
	response.OK(c, gin.H{
		"app": h.config.App.Name,
		"env": h.config.App.Env,
		"services": gin.H{
			"postgres":    h.platform.Postgres != nil,
			"redis":       h.platform.Redis != nil,
			"rabbitmq":    h.platform.RabbitMQ != nil,
			"meilisearch": h.platform.Search != nil,
		},
		"modules": []string{
			"auth",
			"user",
			"article",
			"forum",
			"wall",
			"luckybot",
		},
	})
}
