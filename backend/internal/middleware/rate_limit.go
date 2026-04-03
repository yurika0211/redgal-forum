package middleware

import "github.com/gin-gonic/gin"

func RateLimit(policy string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if policy != "" {
			c.Writer.Header().Set("X-Rate-Limit-Policy", policy)
		}

		c.Next()
	}
}
