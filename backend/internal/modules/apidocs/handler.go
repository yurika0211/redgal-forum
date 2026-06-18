package apidocs

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const swaggerHTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rubedo API Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f6f8fa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.addEventListener("load", function () {
      SwaggerUIBundle({
        url: "/swagger/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true
      });
    });
  </script>
</body>
</html>`

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Redirect(c *gin.Context) {
	c.Redirect(http.StatusMovedPermanently, "/swagger/")
}

func (h *Handler) UI(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(swaggerHTML))
}

func (h *Handler) OpenAPI(c *gin.Context) {
	c.JSON(http.StatusOK, BuildOpenAPISpec())
}
