package response

import (
	"net/http"

	"example.com/rubedo/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func OK(c *gin.Context, data any) {
	write(c, http.StatusOK, data, "")
}

func Created(c *gin.Context, data any) {
	write(c, http.StatusCreated, data, "")
}

func Accepted(c *gin.Context, data any) {
	write(c, http.StatusAccepted, data, "")
}

func Error(c *gin.Context, status int, message string) {
	write(c, status, nil, message)
}

func NotImplemented(c *gin.Context, capability string) {
	Accepted(c, gin.H{
		"status":     "scaffolded",
		"capability": capability,
		"message":    "business logic is intentionally deferred in this scaffold",
	})
}

func write(c *gin.Context, status int, data any, message string) {
	payload := gin.H{
		"ok":         status < http.StatusBadRequest,
		"request_id": middleware.RequestIDFromGin(c),
	}
	if data != nil {
		payload["data"] = data
	}
	if message != "" {
		payload["error"] = message
	}

	c.JSON(status, payload)
}
