package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const RequestIDKey = "request_id"

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = fmt.Sprintf("%d", time.Now().UnixNano())
		}

		c.Set(RequestIDKey, requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)
		c.Next()
	}
}

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"ok":         false,
			"error":      "internal server error",
			"request_id": RequestIDFromGin(c),
		})
	})
}

func RequestIDFromGin(c *gin.Context) string {
	value, exists := c.Get(RequestIDKey)
	if !exists {
		return ""
	}

	requestID, ok := value.(string)
	if !ok {
		return ""
	}

	return requestID
}
